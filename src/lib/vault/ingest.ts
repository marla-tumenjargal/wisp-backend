import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import AdmZip from "adm-zip";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeLinkKey, parseMarkdownNote, type ParsedNote } from "./parse";

export type VaultUploadSummary = {
  node_count: number;
  edge_count: number;
  synced_at: string;
  vault_name: string | null;
};

const SKIP_DIR_NAMES = new Set([
  ".obsidian",
  ".trash",
  ".git",
  "__macosx",
  "node_modules",
]);

async function walkMarkdownFiles(rootDir: string): Promise<string[]> {
  const results: string[] = [];

  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIR_NAMES.has(entry.name.toLowerCase())) continue;
        await walk(full);
        continue;
      }
      if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
        results.push(full);
      }
    }
  }

  await walk(rootDir);
  return results;
}

function detectVaultName(extractedRoot: string, files: string[]): string | null {
  // Prefer a single top-level folder name when zip wraps the vault
  const rel = files.map((f) => path.relative(extractedRoot, f));
  const tops = new Set(
    rel
      .map((r) => r.split(path.sep)[0])
      .filter(Boolean),
  );
  if (tops.size === 1) {
    const only = [...tops][0];
    if (only.toLowerCase() !== "__macosx") return only;
  }
  return null;
}

function buildSharedTagEdges(
  userId: string,
  nodes: { id: string; tags: string[] }[],
): {
  user_id: string;
  source_node_id: string;
  target_node_id: string;
  edge_type: "shared_tag";
  weight: number;
  metadata: { shared_tags: string[]; shared_count: number };
}[] {
  const tagToNodes = new Map<string, string[]>();
  for (const node of nodes) {
    for (const tag of node.tags) {
      const list = tagToNodes.get(tag) ?? [];
      list.push(node.id);
      tagToNodes.set(tag, list);
    }
  }

  const pairTags = new Map<string, Set<string>>();
  for (const [tag, ids] of tagToNodes) {
    if (ids.length < 2) continue;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = ids[i];
        const b = ids[j];
        const [source, target] = a < b ? [a, b] : [b, a];
        const key = `${source}::${target}`;
        const set = pairTags.get(key) ?? new Set<string>();
        set.add(tag);
        pairTags.set(key, set);
      }
    }
  }

  const edges: {
    user_id: string;
    source_node_id: string;
    target_node_id: string;
    edge_type: "shared_tag";
    weight: number;
    metadata: { shared_tags: string[]; shared_count: number };
  }[] = [];

  for (const [key, tags] of pairTags) {
    if (tags.size < 2) continue;
    const [source_node_id, target_node_id] = key.split("::");
    const shared = [...tags].sort();
    edges.push({
      user_id: userId,
      source_node_id,
      target_node_id,
      edge_type: "shared_tag",
      weight: shared.length,
      metadata: { shared_tags: shared, shared_count: shared.length },
    });
  }

  return edges;
}

async function chunkedInsert(
  table: "vault_nodes" | "vault_edges",
  rows: Record<string, unknown>[],
  chunkSize = 200,
) {
  const admin = createAdminClient();
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await admin.from(table).insert(chunk as never);
    if (error) throw new Error(`Failed inserting ${table}: ${error.message}`);
  }
}

export async function ingestVaultZip(
  userId: string,
  zipBuffer: Buffer,
  originalName?: string,
): Promise<VaultUploadSummary> {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), `wisp-vault-${userId.slice(0, 8)}-`));
  const extractDir = path.join(tempRoot, "extract");
  await fs.mkdir(extractDir, { recursive: true });

  try {
    const zip = new AdmZip(zipBuffer);
    zip.extractAllTo(extractDir, true);

    const mdFiles = await walkMarkdownFiles(extractDir);
    if (mdFiles.length === 0) {
      throw new Error("No Markdown (.md) files found in this zip.");
    }

    const vaultName =
      detectVaultName(extractDir, mdFiles) ||
      (originalName ? originalName.replace(/\.zip$/i, "") : null);

    const parsed: ParsedNote[] = [];
    for (const filePath of mdFiles) {
      const relative = path.relative(extractDir, filePath);
      // Guard against path traversal leftovers
      if (relative.startsWith("..")) continue;
      const raw = await fs.readFile(filePath, "utf8");
      parsed.push(parseMarkdownNote(relative, raw));
    }

    const syncedAt = new Date().toISOString();
    const nodes = parsed.map((note) => {
      const id = randomUUID();
      return {
        id,
        user_id: userId,
        title: note.title,
        filename: note.filename,
        path: note.path,
        body: note.body,
        frontmatter: note.frontmatter,
        tags: note.tags,
        wikilinks: note.wikilinks,
        synced_at: syncedAt,
        updated_at: syncedAt,
      };
    });

    // Resolve wikilinks → node ids (by title, stem, path, filename)
    const lookup = new Map<string, string>();
    for (const node of nodes) {
      const stem = node.filename.replace(/\.md$/i, "");
      const keys = [
        normalizeLinkKey(node.title),
        normalizeLinkKey(stem),
        normalizeLinkKey(node.filename),
        normalizeLinkKey(node.path),
        normalizeLinkKey(node.path.replace(/\.md$/i, "")),
      ];
      for (const key of keys) {
        if (!lookup.has(key)) lookup.set(key, node.id);
      }
    }

    const backlinkEdges: {
      id: string;
      user_id: string;
      source_node_id: string;
      target_node_id: string;
      edge_type: "backlink";
      weight: number;
      metadata: { target: string };
    }[] = [];

    const seenBacklinks = new Set<string>();
    for (const node of nodes) {
      for (const target of node.wikilinks) {
        const targetId = lookup.get(normalizeLinkKey(target));
        if (!targetId || targetId === node.id) continue;
        const key = `${node.id}::${targetId}`;
        if (seenBacklinks.has(key)) continue;
        seenBacklinks.add(key);
        backlinkEdges.push({
          id: randomUUID(),
          user_id: userId,
          source_node_id: node.id,
          target_node_id: targetId,
          edge_type: "backlink",
          weight: 1,
          metadata: { target },
        });
      }
    }

    const sharedTagEdges = buildSharedTagEdges(
      userId,
      nodes.map((n) => ({ id: n.id, tags: n.tags })),
    ).map((edge) => ({ id: randomUUID(), ...edge }));

    const admin = createAdminClient();

    // Replace previous vault for this user
    await admin.from("vault_edges").delete().eq("user_id", userId);
    await admin.from("vault_nodes").delete().eq("user_id", userId);

    await chunkedInsert("vault_nodes", nodes);
    await chunkedInsert("vault_edges", [...backlinkEdges, ...sharedTagEdges]);

    const edgeCount = backlinkEdges.length + sharedTagEdges.length;
    const { error: syncError } = await admin.from("vault_syncs").upsert(
      {
        user_id: userId,
        node_count: nodes.length,
        edge_count: edgeCount,
        vault_name: vaultName,
        synced_at: syncedAt,
        updated_at: syncedAt,
      },
      { onConflict: "user_id" },
    );

    if (syncError) {
      throw new Error(`Failed saving vault sync summary: ${syncError.message}`);
    }

    return {
      node_count: nodes.length,
      edge_count: edgeCount,
      synced_at: syncedAt,
      vault_name: vaultName,
    };
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true }).catch(() => undefined);
  }
}

/** Stable hash helper reserved for future content-addressed embeddings */
export function contentHash(body: string): string {
  return createHash("sha256").update(body).digest("hex");
}

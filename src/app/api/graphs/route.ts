import { NextResponse } from "next/server";
import { analyzeAestheticBrief } from "@/lib/graphs/analyze-aesthetic";
import { createGraph, listGraphs } from "@/lib/graphs/queries";
import { uploadGraphReference } from "@/lib/graphs/reference-upload";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const graphs = await listGraphs(supabase, user.id);

    const withCounts = await Promise.all(
      graphs.map(async (graph) => {
        const [{ count: nodeCount }, { count: edgeCount }] = await Promise.all([
          supabase
            .from("vault_nodes")
            .select("*", { count: "exact", head: true })
            .eq("graph_id", graph.id),
          supabase
            .from("vault_edges")
            .select("*", { count: "exact", head: true })
            .eq("graph_id", graph.id),
        ]);
        return {
          ...graph,
          node_count: nodeCount ?? 0,
          edge_count: edgeCount ?? 0,
        };
      }),
    );

    return NextResponse.json({ graphs: withCounts });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list graphs";
    const missing = /relation .* does not exist|schema cache|column .* does not exist/i.test(
      message,
    );
    return NextResponse.json(
      {
        error: missing
          ? "Run supabase/migrations/008–011 (graphs, focus, motive, storage)."
          : message,
      },
      { status: missing ? 503 : 500 },
    );
  }
}

async function readCreateBody(request: Request): Promise<{
  name?: string;
  description?: string;
  creating?: string;
  theme?: string;
  goal?: string;
  similarities?: string;
  file?: File | null;
}> {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("reference");
    return {
      name: String(form.get("name") ?? "") || undefined,
      description: String(form.get("description") ?? "") || undefined,
      creating: String(form.get("creating") ?? "") || undefined,
      theme: String(form.get("theme") ?? "") || undefined,
      goal: String(form.get("goal") ?? "") || undefined,
      similarities: String(form.get("similarities") ?? "") || undefined,
      file: file instanceof File && file.size > 0 ? file : null,
    };
  }

  const json = (await request.json()) as Record<string, string>;
  return {
    name: json.name,
    description: json.description,
    creating: json.creating ?? json.focus,
    theme: json.theme,
    goal: json.goal,
    similarities: json.similarities,
    file: null,
  };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Awaited<ReturnType<typeof readCreateBody>>;
  try {
    body = await readCreateBody(request);
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const creating = body.creating?.trim() ?? "";
  if (!creating) {
    return NextResponse.json(
      {
        error:
          "What are you creating? Tell us the motive behind this inspiration board.",
      },
      { status: 400 },
    );
  }

  const motive = {
    creating,
    theme: body.theme?.trim() || null,
    goal: body.goal?.trim() || null,
    similarities: body.similarities?.trim() || null,
  };

  let imagePayload: { buffer: Buffer; mimeType: string } | null = null;
  if (body.file) {
    imagePayload = {
      buffer: Buffer.from(await body.file.arrayBuffer()),
      mimeType: body.file.type || "image/jpeg",
    };
  }

  const brief = await analyzeAestheticBrief({
    motive,
    image: imagePayload,
  });

  try {
    // Create first to get an id for storage path
    let graph = await createGraph(supabase, user.id, {
      name: body.name,
      description: body.description,
      ...motive,
      aesthetic_brief: brief,
    });

    if (body.file && imagePayload) {
      try {
        const uploaded = await uploadGraphReference({
          userId: user.id,
          graphId: graph.id,
          file: body.file,
          mimeType: imagePayload.mimeType,
        });

        const { data: updated, error } = await supabase
          .from("graphs")
          .update({
            reference_image_url: uploaded.publicUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", graph.id)
          .eq("user_id", user.id)
          .select(
            "id, user_id, name, description, focus, creating, theme, goal, similarities, reference_image_url, aesthetic_brief, vault_name, vault_node_count, vault_edge_count, vault_synced_at, created_at, updated_at",
          )
          .single();

        if (!error && updated) graph = updated as typeof graph;
        else
          graph = {
            ...graph,
            reference_image_url: uploaded.publicUrl,
          };
      } catch (uploadErr) {
        console.error("reference upload failed", uploadErr);
        // Board still works from aesthetic brief even if storage fails
      }
    }

    return NextResponse.json({ graph }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create graph";
    const missing = /relation .* does not exist|schema cache|column .* does not exist/i.test(
      message,
    );
    return NextResponse.json(
      {
        error: missing
          ? "Run supabase/migrations/008–011 (graphs, motive, storage)."
          : message,
      },
      { status: missing ? 503 : 500 },
    );
  }
}

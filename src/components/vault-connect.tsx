"use client";

import { useRef, useState } from "react";

type VaultConnectProps = {
  graphId?: string;
  onSuccess: (summary: {
    node_count: number;
    edge_count: number;
    synced_at: string;
    vault_name: string | null;
  }) => void;
  onCancel?: () => void;
  mode?: "connect" | "resync";
};

type UploadPhase = "idle" | "uploading" | "processing" | "error";

export function VaultConnect({
  graphId,
  onSuccess,
  onCancel,
  mode = "connect",
}: VaultConnectProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    setFileName(file.name);
    setPhase("uploading");
    setProgress(0);

    try {
      const summary = await uploadWithProgress(file, graphId, (pct) => {
        setProgress(pct);
        if (pct >= 100) setPhase("processing");
      });
      onSuccess(summary);
    } catch (err) {
      setPhase("error");
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".zip")) {
      setError("Please upload a .zip export of your Obsidian vault.");
      setPhase("error");
      return;
    }
    void upload(file);
  }

  const busy = phase === "uploading" || phase === "processing";

  return (
    <div className="rounded-md border border-dashed border-ink/20 bg-white/50 p-5 backdrop-blur-sm">
      <p className="text-sm font-medium tracking-[0.08em] text-klein lowercase">
        second brain
      </p>
      <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-[-0.02em] text-ink">
        {mode === "resync" ? "Re-sync Obsidian vault" : "Connect Obsidian vault"}
      </h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-ink/60">
        Obsidian has no cloud API — zip your vault folder and upload it. We parse
        notes, wikilinks, and tags into your graph. Embeddings come next.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="inline-flex h-11 items-center justify-center rounded-md bg-klein px-5 text-sm font-medium text-white transition-[background-color,opacity] hover:bg-klein-deep disabled:cursor-wait disabled:opacity-60"
        >
          {busy
            ? phase === "uploading"
              ? "Uploading…"
              : "Processing…"
            : mode === "resync"
              ? "Choose new .zip"
              : "Upload .zip"}
        </button>
        {mode === "resync" && onCancel ? (
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-md border border-ink/15 px-4 py-2 text-sm font-medium text-ink/70 hover:bg-white/70 disabled:opacity-50"
          >
            Cancel
          </button>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={onFileChange}
        />
      </div>

      {fileName ? (
        <p className="mt-3 text-sm text-ink/50">{fileName}</p>
      ) : null}

      {busy ? (
        <div className="mt-4">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
            <div
              className="h-full rounded-full bg-klein transition-[width] duration-200"
              style={{
                width:
                  phase === "processing"
                    ? "100%"
                    : `${Math.max(progress, 4)}%`,
              }}
            />
          </div>
          <p className="mt-2 text-xs tracking-wide text-ink/50">
            {phase === "uploading"
              ? `Uploading ${progress}%`
              : "Parsing notes, links, and tags…"}
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function uploadWithProgress(
  file: File,
  graphId: string | undefined,
  onProgress: (pct: number) => void,
): Promise<{
  node_count: number;
  edge_count: number;
  synced_at: string;
  vault_name: string | null;
}> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/vault/upload");
    xhr.responseType = "json";

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      const body = xhr.response;
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body);
        return;
      }
      reject(
        new Error(
          (body && typeof body === "object" && "error" in body
            ? String((body as { error: string }).error)
            : null) || `Upload failed (${xhr.status})`,
        ),
      );
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));

    const form = new FormData();
    form.append("file", file);
    if (graphId) form.append("graphId", graphId);
    xhr.send(form);
  });
}

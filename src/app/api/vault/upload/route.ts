import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ingestVaultZip } from "@/lib/vault/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 50 * 1024 * 1024; // 50MB

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  const file = form.get("file");
  const graphIdRaw = form.get("graphId");
  const graphId =
    typeof graphIdRaw === "string" && graphIdRaw.length > 0
      ? graphIdRaw
      : undefined;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Expected a zip file field named file" }, { status: 400 });
  }

  if (graphId) {
    const { data: owned } = await supabase
      .from("graphs")
      .select("id")
      .eq("id", graphId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!owned) {
      return NextResponse.json({ error: "Graph not found" }, { status: 404 });
    }
  }

  if (!file.name.toLowerCase().endsWith(".zip") && file.type !== "application/zip") {
    return NextResponse.json({ error: "Only .zip vault exports are supported" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Zip exceeds 50MB limit" }, { status: 413 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const summary = await ingestVaultZip(user.id, buffer, file.name, graphId);
    return NextResponse.json(summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Vault ingest failed";
    const missing =
      /relation .* does not exist|Could not find the table|schema cache/i.test(
        message,
      );
    return NextResponse.json(
      {
        error: missing
          ? "Vault tables are missing. Run supabase/migrations/005_vault.sql in the Supabase SQL Editor."
          : message,
      },
      { status: missing ? 503 : 500 },
    );
  }
}

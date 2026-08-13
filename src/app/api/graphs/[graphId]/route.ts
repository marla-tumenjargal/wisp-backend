import { NextResponse } from "next/server";
import { analyzeAestheticBrief } from "@/lib/graphs/analyze-aesthetic";
import { composeMotiveText } from "@/lib/graphs/motive";
import { GRAPH_SELECT, getGraph } from "@/lib/graphs/queries";
import { uploadGraphReference } from "@/lib/graphs/reference-upload";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ graphId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { graphId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const graph = await getGraph(supabase, user.id, graphId);
    if (!graph) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ graph });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const { graphId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") || "";
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  let file: File | null = null;
  let creating: string | undefined;
  let theme: string | null | undefined;
  let goal: string | null | undefined;
  let similarities: string | null | undefined;
  let name: string | null | undefined;
  let description: string | null | undefined;
  let reanalyze = false;

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const ref = form.get("reference");
    file = ref instanceof File && ref.size > 0 ? ref : null;
    if (form.has("creating")) creating = String(form.get("creating") ?? "");
    if (form.has("theme")) theme = String(form.get("theme") ?? "") || null;
    if (form.has("goal")) goal = String(form.get("goal") ?? "") || null;
    if (form.has("similarities"))
      similarities = String(form.get("similarities") ?? "") || null;
    if (form.has("name")) name = String(form.get("name") ?? "") || null;
    if (form.has("description"))
      description = String(form.get("description") ?? "") || null;
    reanalyze = form.get("reanalyze") === "1" || Boolean(file) || Boolean(creating);
  } else {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    if ("creating" in body || "focus" in body) {
      creating = String(body.creating ?? body.focus ?? "");
    }
    if ("theme" in body) theme = (body.theme as string) || null;
    if ("goal" in body) goal = (body.goal as string) || null;
    if ("similarities" in body)
      similarities = (body.similarities as string) || null;
    if ("name" in body) name = (body.name as string) || null;
    if ("description" in body)
      description = (body.description as string) || null;
    reanalyze = Boolean(body.reanalyze) || "creating" in body || "focus" in body;
  }

  const existing = await getGraph(supabase, user.id, graphId);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;

  const nextCreating = (creating ?? existing.creating ?? existing.focus ?? "").trim();
  const nextTheme =
    theme !== undefined ? theme : existing.theme;
  const nextGoal = goal !== undefined ? goal : existing.goal;
  const nextSimilarities =
    similarities !== undefined ? similarities : existing.similarities;

  if (!nextCreating) {
    return NextResponse.json(
      {
        error:
          "What are you creating? A motive is required for this inspiration board.",
      },
      { status: 400 },
    );
  }

  if (
    creating !== undefined ||
    theme !== undefined ||
    goal !== undefined ||
    similarities !== undefined
  ) {
    updates.creating = nextCreating;
    updates.theme = nextTheme;
    updates.goal = nextGoal;
    updates.similarities = nextSimilarities;
    updates.focus = composeMotiveText({
      creating: nextCreating,
      theme: nextTheme,
      goal: nextGoal,
      similarities: nextSimilarities,
    });
  }

  let imagePayload: { buffer: Buffer; mimeType: string } | null = null;
  if (file) {
    imagePayload = {
      buffer: Buffer.from(await file.arrayBuffer()),
      mimeType: file.type || "image/jpeg",
    };
    try {
      const uploaded = await uploadGraphReference({
        userId: user.id,
        graphId,
        file,
        mimeType: imagePayload.mimeType,
      });
      updates.reference_image_url = uploaded.publicUrl;
    } catch (err) {
      return NextResponse.json(
        {
          error:
            err instanceof Error
              ? err.message
              : "Could not upload reference image. Run 011_graph_reference_storage.sql?",
        },
        { status: 500 },
      );
    }
  }

  if (reanalyze) {
    const brief = await analyzeAestheticBrief({
      motive: {
        creating: nextCreating,
        theme: nextTheme,
        goal: nextGoal,
        similarities: nextSimilarities,
      },
      image: imagePayload,
    });
    if (brief) updates.aesthetic_brief = brief;
  }

  const { data, error } = await supabase
    .from("graphs")
    .update(updates)
    .eq("id", graphId)
    .eq("user_id", user.id)
    .select(GRAPH_SELECT)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ graph: data });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { graphId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("graphs")
    .delete()
    .eq("id", graphId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { interpretMotive } from "@/lib/graphs/focus";
import type { AestheticBrief } from "@/lib/graphs/motive";
import { loadUserInterestSlugs } from "@/lib/interests/user-interests";
import { recommendBoardSuggestions } from "@/lib/suggestions/recommend";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const graphId = new URL(request.url).searchParams.get("graphId");
  if (!graphId) {
    return NextResponse.json({ error: "Missing graphId" }, { status: 400 });
  }

  const { data: graph, error: graphError } = await supabase
    .from("graphs")
    .select(
      "id, focus, name, creating, theme, goal, similarities, reference_image_url, aesthetic_brief",
    )
    .eq("id", graphId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (graphError) {
    const missing =
      /column .* does not exist|schema cache|relation .* does not exist/i.test(
        graphError.message,
      );
    return NextResponse.json(
      {
        error: missing
          ? "Run supabase/migrations/008–011 in the SQL editor."
          : graphError.message,
      },
      { status: missing ? 503 : 500 },
    );
  }

  if (!graph) {
    return NextResponse.json({ error: "Graph not found" }, { status: 404 });
  }

  const focusCtx = interpretMotive({
    motive: {
      creating: (graph.creating as string) || (graph.focus as string) || "",
      theme: (graph.theme as string) || null,
      goal: (graph.goal as string) || null,
      similarities: (graph.similarities as string) || null,
    },
    focus: graph.focus as string | null,
    brief: (graph.aesthetic_brief as AestheticBrief | null) ?? null,
    referenceImageUrl: (graph.reference_image_url as string) || null,
  });

  const interestSlugs = await loadUserInterestSlugs(supabase, user);

  let substackPublications: string[] = [];
  const { data: profile } = await supabase
    .from("profiles")
    .select("substack_publications")
    .eq("id", user.id)
    .maybeSingle();

  if (Array.isArray(profile?.substack_publications)) {
    substackPublications = profile.substack_publications.filter(
      (s): s is string => typeof s === "string",
    );
  } else {
    const meta = user.user_metadata?.substack_publications;
    if (Array.isArray(meta)) {
      substackPublications = meta.filter(
        (s): s is string => typeof s === "string",
      );
    }
  }

  try {
    const suggestions = await recommendBoardSuggestions(interestSlugs, {
      substackPublications,
      focus: focusCtx,
    });
    return NextResponse.json({
      suggestions,
      based_on: interestSlugs,
      motive: {
        creating: graph.creating,
        theme: graph.theme,
        goal: graph.goal,
        similarities: graph.similarities,
        reference_image_url: graph.reference_image_url,
      },
      focus: graph.focus,
      focus_context: focusCtx,
      substack_publications: substackPublications,
      count: suggestions.length,
      sources: {
        arena: suggestions.filter((s) => s.kind === "arena").length,
        font: suggestions.filter((s) => s.kind === "font").length,
        color: suggestions.filter((s) => s.kind === "color").length,
        song: suggestions.filter((s) => s.kind === "song").length,
        substack: suggestions.filter((s) => s.kind === "substack").length,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to fetch suggestions",
      },
      { status: 502 },
    );
  }
}

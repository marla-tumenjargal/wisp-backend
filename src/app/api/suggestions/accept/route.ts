import { NextResponse } from "next/server";
import { acceptBoardSuggestion } from "@/lib/suggestions/accept";
import type { BoardSuggestion } from "@/lib/suggestions/types";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { suggestion?: BoardSuggestion; graphId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const suggestion = body.suggestion;
  const graphId = body.graphId;
  if (!suggestion?.id || !suggestion.title || !suggestion.kind) {
    return NextResponse.json({ error: "Missing suggestion" }, { status: 400 });
  }
  if (!graphId) {
    return NextResponse.json({ error: "Missing graphId" }, { status: 400 });
  }

  const { data: owned } = await supabase
    .from("graphs")
    .select("id")
    .eq("id", graphId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!owned) {
    return NextResponse.json({ error: "Graph not found" }, { status: 404 });
  }

  try {
    const result = await acceptBoardSuggestion(user.id, graphId, suggestion);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Accept failed";
    const missing =
      /relation .* does not exist|Could not find the|schema cache|column .* does not exist/i.test(
        message,
      );
    return NextResponse.json(
      {
        error: missing
          ? "Knowledge graph schema is missing. Run supabase/migrations/005–008 (including 008_graphs.sql)."
          : message,
      },
      { status: missing ? 503 : 500 },
    );
  }
}

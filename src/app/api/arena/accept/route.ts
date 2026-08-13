import { NextResponse } from "next/server";
import { acceptArenaSuggestion } from "@/lib/arena/accept";
import type { ArenaSuggestion } from "@/lib/arena/recommend";
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

  let body: { suggestion?: ArenaSuggestion };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const suggestion = body.suggestion;
  if (!suggestion?.id || !suggestion.title) {
    return NextResponse.json({ error: "Missing suggestion" }, { status: 400 });
  }

  try {
    const result = await acceptArenaSuggestion(user.id, suggestion);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Accept failed";
    const missing = /relation .* does not exist|Could not find the|schema cache|column .* does not exist/i.test(
      message,
    );
    return NextResponse.json(
      {
        error: missing
          ? "Knowledge graph schema is missing. Run supabase/migrations/005_vault.sql and 006_arena_graph.sql."
          : message,
      },
      { status: missing ? 503 : 500 },
    );
  }
}

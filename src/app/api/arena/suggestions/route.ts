import { NextResponse } from "next/server";
import { recommendArenaContent } from "@/lib/arena/recommend";
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

  const interestSlugs: string[] = [];

  const { data: prefs } = await supabase
    .from("user_interest_preferences")
    .select("interest_tags(slug)")
    .eq("user_id", user.id);

  for (const row of prefs ?? []) {
    const tag = row.interest_tags as { slug: string } | { slug: string }[] | null;
    if (!tag) continue;
    const slug = Array.isArray(tag) ? tag[0]?.slug : tag.slug;
    if (slug) interestSlugs.push(slug);
  }

  if (interestSlugs.length === 0) {
    const meta = user.user_metadata?.interest_slugs;
    if (Array.isArray(meta)) {
      interestSlugs.push(...meta.filter((s): s is string => typeof s === "string"));
    }
  }

  try {
    const suggestions = await recommendArenaContent(interestSlugs, 10);
    return NextResponse.json({
      suggestions,
      based_on: interestSlugs,
      count: suggestions.length,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to fetch Are.na suggestions",
      },
      { status: 502 },
    );
  }
}

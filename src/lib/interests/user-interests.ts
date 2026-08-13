import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Load onboarding interest slugs for recommendation. */
export async function loadUserInterestSlugs(
  supabase: SupabaseClient,
  user: User,
): Promise<string[]> {
  const interestSlugs: string[] = [];

  const { data: prefs } = await supabase
    .from("user_interest_preferences")
    .select("interest_tags(slug)")
    .eq("user_id", user.id);

  for (const row of prefs ?? []) {
    const tag = row.interest_tags as
      | { slug: string }
      | { slug: string }[]
      | null;
    if (!tag) continue;
    const slug = Array.isArray(tag) ? tag[0]?.slug : tag.slug;
    if (slug) interestSlugs.push(slug);
  }

  if (interestSlugs.length === 0) {
    const meta = user.user_metadata?.interest_slugs;
    if (Array.isArray(meta)) {
      interestSlugs.push(
        ...meta.filter((s): s is string => typeof s === "string"),
      );
    }
  }

  return interestSlugs;
}

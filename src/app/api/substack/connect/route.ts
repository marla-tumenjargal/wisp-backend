import { NextResponse } from "next/server";
import {
  parsePublicationInput,
  verifySubstackPublication,
} from "@/lib/suggestions/substack";
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("substack_publications")
    .eq("id", user.id)
    .maybeSingle();

  let publications: string[] = [];
  if (Array.isArray(profile?.substack_publications)) {
    publications = profile.substack_publications;
  } else {
    const meta = user.user_metadata?.substack_publications;
    if (Array.isArray(meta)) {
      publications = meta.filter((s): s is string => typeof s === "string");
    }
  }

  return NextResponse.json({ publications });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { publication?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slug = parsePublicationInput(body.publication ?? "");
  if (!slug) {
    return NextResponse.json(
      { error: "Enter a Substack publication URL or slug (e.g. dense-discovery)" },
      { status: 400 },
    );
  }

  const verified = await verifySubstackPublication(slug);
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("substack_publications")
    .eq("id", user.id)
    .maybeSingle();

  const existing = Array.isArray(profile?.substack_publications)
    ? profile.substack_publications
    : [];
  const publications = existing.includes(slug)
    ? existing
    : [...existing, slug].slice(0, 20);

  const { error } = await supabase
    .from("profiles")
    .update({
      substack_publications: publications,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  // Always mirror to user_metadata so recommendations work even without the column
  await supabase.auth.updateUser({
    data: { substack_publications: publications },
  });

  if (error) {
    // Column may be missing — metadata still saved
    const missing = /column .* does not exist|schema cache/i.test(error.message);
    if (!missing) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    ok: true,
    publications,
    added: slug,
  });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { publication?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slug = parsePublicationInput(body.publication ?? "");
  if (!slug) {
    return NextResponse.json({ error: "Missing publication" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("substack_publications")
    .eq("id", user.id)
    .maybeSingle();

  const existing = Array.isArray(profile?.substack_publications)
    ? profile.substack_publications
    : Array.isArray(user.user_metadata?.substack_publications)
      ? (user.user_metadata.substack_publications as string[])
      : [];

  const publications = existing.filter((p) => p !== slug);

  await supabase
    .from("profiles")
    .update({
      substack_publications: publications,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  await supabase.auth.updateUser({
    data: { substack_publications: publications },
  });

  return NextResponse.json({ ok: true, publications });
}

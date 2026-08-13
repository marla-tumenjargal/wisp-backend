import type { AestheticBrief, GraphMotiveInput } from "@/lib/graphs/motive";
import { composeMotiveText } from "@/lib/graphs/motive";

const VISION_SCHEMA_HINT = `{
  "aesthetic_summary": "2-3 sentences on the visual language for creatives",
  "mood": ["up to 5 mood words"],
  "colors": [{"name":"orange","hex":"#E85D04"}],
  "materials": ["paper","film grain", "..."],
  "era_or_movement": ["swiss modernism", "..."],
  "visual_keywords": ["citrus","botanical","soft light", "..."],
  "medium_affinities": ["photography","typography","editorial","music", "..."],
  "search_queries": ["3-6 short queries to find similar inspiration"],
  "arena_channels": ["likely public are.na channel slugs, lowercase hyphenated"],
  "font_direction": "serif|sans|display|mono|mixed",
  "music_mood": "short phrase for soundtrack search",
  "similarity_notes": "what 'similar' should mean for lookalike recommendations"
}`;

function safeJsonParse(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence ? fence[1].trim() : trimmed;
  return JSON.parse(raw);
}

function normalizeBrief(raw: Record<string, unknown>): AestheticBrief {
  const colorsRaw = Array.isArray(raw.colors) ? raw.colors : [];
  const colors = colorsRaw
    .map((c) => {
      if (!c || typeof c !== "object") return null;
      const obj = c as Record<string, unknown>;
      const name = typeof obj.name === "string" ? obj.name.toLowerCase() : null;
      const hex = typeof obj.hex === "string" ? obj.hex : null;
      if (!name || !hex) return null;
      return { name, hex };
    })
    .filter((c): c is { name: string; hex: string } => Boolean(c));

  const strArr = (v: unknown) =>
    Array.isArray(v)
      ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      : [];

  const font = raw.font_direction;
  const fontDirection =
    font === "serif" ||
    font === "sans" ||
    font === "display" ||
    font === "mono" ||
    font === "mixed"
      ? font
      : "mixed";

  return {
    aesthetic_summary:
      typeof raw.aesthetic_summary === "string"
        ? raw.aesthetic_summary
        : "Refined, editorial inspiration.",
    mood: strArr(raw.mood).slice(0, 6),
    colors: colors.slice(0, 6),
    materials: strArr(raw.materials).slice(0, 8),
    era_or_movement: strArr(raw.era_or_movement).slice(0, 6),
    visual_keywords: strArr(raw.visual_keywords).slice(0, 12),
    medium_affinities: strArr(raw.medium_affinities).slice(0, 8),
    search_queries: strArr(raw.search_queries).slice(0, 8),
    arena_channels: strArr(raw.arena_channels)
      .map((s) => s.toLowerCase().replace(/[^a-z0-9-]/g, ""))
      .filter(Boolean)
      .slice(0, 8),
    font_direction: fontDirection,
    music_mood:
      typeof raw.music_mood === "string" ? raw.music_mood : "ambient cinematic",
    similarity_notes:
      typeof raw.similarity_notes === "string"
        ? raw.similarity_notes
        : "Match palette, texture, and composition.",
    analyzed_at: new Date().toISOString(),
  };
}

/**
 * Analyze motive (+ optional reference image) into an aesthetic brief
 * that steers stylish multi-medium recommendations.
 */
export async function analyzeAestheticBrief(options: {
  motive: GraphMotiveInput;
  image?: { buffer: Buffer; mimeType: string } | null;
}): Promise<AestheticBrief | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const motiveText = composeMotiveText(options.motive);
  const system = `You are the taste engine for Wisp — an inspiration board for creatives and designers who gather ideas across mediums (not Pinterest). Prefer refined, stylish, editorial, gallery-grade aesthetics. Avoid generic stock or cluttered trends. Always return valid JSON only.`;

  const userText = `Creative motive:
${motiveText}

Return JSON matching this shape:
${VISION_SCHEMA_HINT}

Bias toward aesthetic quality and lookalike similarity within the stated theme/goal.`;

  type ContentPart =
    | { type: "text"; text: string }
    | {
        type: "image_url";
        image_url: { url: string; detail?: "low" | "high" | "auto" };
      };

  const content: ContentPart[] = [{ type: "text", text: userText }];

  if (options.image?.buffer?.length) {
    const b64 = options.image.buffer.toString("base64");
    const mime = options.image.mimeType || "image/jpeg";
    content.push({
      type: "image_url",
      image_url: {
        url: `data:${mime};base64,${b64}`,
        detail: "low",
      },
    });
    content.push({
      type: "text",
      text: "The attached photo is a visual reference. Extract lookalike cues (palette, texture, composition, era) and fill search_queries / arena_channels / colors so we can recommend similar inspiration within this theme.",
    });
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("aesthetic brief failed", res.status, errText.slice(0, 200));
      return null;
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const contentText = json.choices?.[0]?.message?.content;
    if (!contentText) return null;
    const parsed = safeJsonParse(contentText) as Record<string, unknown>;
    return normalizeBrief(parsed);
  } catch (err) {
    console.error("aesthetic brief error", err);
    return null;
  }
}

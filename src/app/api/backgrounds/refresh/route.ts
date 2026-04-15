import { NextResponse } from "next/server";
import { listRecords, createRecord } from "@/lib/airtable";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type BackgroundFields = {
  Title?: string;
  "YouTube URL"?: string;
  "Video ID"?: string;
  Category?: string;
  "Thumbnail URL"?: string;
  "Added Date"?: string;
  "Times Used"?: number;
  Status?: string;
};

// Search queries focused on user's preferred categories
const SEARCH_POOL: { category: string; queries: string[] }[] = [
  { category: "ASMR", queries: [
    "satisfying asmr compilation",
    "soap cutting asmr",
    "kinetic sand asmr cutting",
    "slime asmr satisfying",
    "wood carving asmr",
    "honeycomb asmr",
    "soap shaving asmr",
    "rock crushing satisfying",
    "hydraulic press satisfying",
    "asmr cake decorating",
    "satisfying paint mixing",
    "satisfying glass etching",
  ]},
  { category: "Memes", queries: [
    "tiktok memes compilation",
    "viral memes 2025",
    "best memes this week",
    "discord memes try not to laugh",
    "internet memes ranking",
    "brainrot memes compilation",
    "dank memes 2024",
    "funniest memes compilation",
  ]},
  { category: "Cartoons", queries: [
    "spongebob best moments",
    "tom and jerry full episodes",
    "looney tunes mega compilation",
    "scooby doo classic episodes",
    "rugrats best moments",
    "powerpuff girls classic",
    "dexters laboratory classic",
    "courage the cowardly dog",
    "ed edd n eddy compilation",
    "fairly oddparents best",
    "spongebob funniest moments",
    "tom and jerry cat and mouse",
  ]},
  { category: "Random", queries: [
    "cutest puppies compilation",
    "golden retriever puppies",
    "funny dogs compilation",
    "puppies playing compilation",
    "tiny puppies compilation",
    "husky puppies compilation",
    "labrador puppies funny",
    "corgi puppies compilation",
    "kittens and puppies compilation",
  ]},
];

function pickRandomQueries(perCategory = 2): { category: string; query: string }[] {
  return SEARCH_POOL.map(({ category, queries }) => {
    const shuffled = [...queries].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, perCategory).map((q) => ({ category, query: q }));
  }).flat();
}

async function searchYouTube(query: string, max = 10): Promise<string[]> {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
  });
  if (!res.ok) return [];
  const html = await res.text();
  const ids = [...html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)].map((m) => m[1]);
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const id of ids) {
    if (!seen.has(id)) {
      seen.add(id);
      unique.push(id);
    }
    if (unique.length >= max) break;
  }
  return unique;
}

async function verifyVideo(videoId: string): Promise<{ title: string; author: string } | null> {
  try {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return { title: data.title, author: data.author_name };
  } catch {
    return null;
  }
}

async function batchDeleteRecords(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const apiKey = process.env.AIRTABLE_API_KEY!;
  const baseId = process.env.AIRTABLE_BASE_ID!;
  let deleted = 0;
  // Airtable allows max 10 per batch delete
  for (let i = 0; i < ids.length; i += 10) {
    const batch = ids.slice(i, i + 10);
    const params = batch.map((id) => `records[]=${id}`).join("&");
    const res = await fetch(
      `https://api.airtable.com/v0/${baseId}/Backgrounds?${params}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${apiKey}` },
      }
    );
    if (res.ok) {
      const data = await res.json();
      deleted += data.records?.length || 0;
    }
  }
  return deleted;
}

export async function POST() {
  try {
    // 1. Get the current library so we can:
    //    a) Skip duplicates when searching for replacements
    //    b) Delete them after we have new ones queued up
    const existing = await listRecords<BackgroundFields>("Backgrounds");
    const existingIds = new Set(existing.map((r) => r.fields["Video ID"]).filter(Boolean));
    const existingRecordIds = existing.map((r) => r.id);

    // 2. Search for fresh videos (2 queries per category, ~5 keepers per query = ~40 target)
    const queries = pickRandomQueries(2);
    const candidates: { videoId: string; title: string; category: string }[] = [];
    const newIdsSeen = new Set<string>();

    for (const { category, query } of queries) {
      const ids = await searchYouTube(query, 15);
      let added = 0;
      for (const id of ids) {
        if (added >= 5) break;
        if (existingIds.has(id) || newIdsSeen.has(id)) continue;
        const meta = await verifyVideo(id);
        if (meta?.title) {
          candidates.push({
            videoId: id,
            title: meta.title.slice(0, 90),
            category,
          });
          newIdsSeen.add(id);
          added++;
        }
      }
    }

    // 3. Safety check: only proceed with replacement if we found enough new videos
    if (candidates.length < 10) {
      return NextResponse.json({
        error: `Only found ${candidates.length} new videos. Library not replaced. Try again later.`,
        found: candidates.length,
      }, { status: 400 });
    }

    // 4. Insert all new videos first
    const today = new Date().toISOString().split("T")[0];
    const inserted: typeof candidates = [];

    for (const c of candidates) {
      try {
        await createRecord<BackgroundFields>("Backgrounds", {
          Title: c.title,
          "YouTube URL": `https://www.youtube.com/watch?v=${c.videoId}`,
          "Video ID": c.videoId,
          Category: c.category,
          "Thumbnail URL": `https://i.ytimg.com/vi/${c.videoId}/hqdefault.jpg`,
          "Added Date": today,
          "Times Used": 0,
          Status: "active",
        });
        inserted.push(c);
      } catch {
        // continue on individual failure
      }
    }

    // 5. NOW delete the old library (only after new ones safely inserted)
    const deletedCount = await batchDeleteRecords(existingRecordIds);

    return NextResponse.json({
      added: inserted.length,
      deleted: deletedCount,
      newLibrarySize: inserted.length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

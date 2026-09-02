import { MeiliSearch } from "meilisearch";

export const meili = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST ?? "http://localhost:7700",
  apiKey: process.env.MEILISEARCH_API_KEY || undefined,
});

export async function checkMeilisearch(): Promise<boolean> {
  try {
    const health = await meili.health();
    return health.status === "available";
  } catch {
    return false;
  }
}

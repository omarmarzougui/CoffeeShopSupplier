import { MeiliSearch } from "meilisearch";

export const meili = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST ?? "http://localhost:7700",
  apiKey: process.env.MEILISEARCH_API_KEY || undefined,
});

export const PRODUCT_INDEX = "products";

const PRODUCT_INDEX_SETTINGS = {
  searchableAttributes: ["name", "sku", "description"],
  filterableAttributes: ["categoryId", "supplierId", "price", "stockAvailable", "archived"],
  sortableAttributes: ["price", "createdAt"],
};

export async function ensureProductIndex(): Promise<void> {
  const index = meili.index(PRODUCT_INDEX);
  await index.updateSettings(PRODUCT_INDEX_SETTINGS);
}

export async function indexProduct(doc: Record<string, unknown>): Promise<void> {
  try {
    await meili.index(PRODUCT_INDEX).addDocuments([doc]);
  } catch {
    // Meilisearch unavailable — degrade gracefully
  }
}

export async function removeProduct(id: string): Promise<void> {
  try {
    await meili.index(PRODUCT_INDEX).deleteDocument(id);
  } catch {
    // Meilisearch unavailable — degrade gracefully
  }
}

export async function searchProducts(
  query: string,
  options: { filters?: string[]; limit?: number; offset?: number } = {},
): Promise<{ hits: Record<string, unknown>[]; estimatedTotalHits: number }> {
  try {
    const result = await meili.index(PRODUCT_INDEX).search<Record<string, unknown>>(query, {
      filter: options.filters,
      limit: options.limit ?? 20,
      offset: options.offset ?? 0,
    });
    return { hits: result.hits, estimatedTotalHits: result.estimatedTotalHits ?? result.hits.length };
  } catch {
    return { hits: [], estimatedTotalHits: 0 };
  }
}

export async function checkMeilisearch(): Promise<boolean> {
  try {
    const health = await meili.health();
    return health.status === "available";
  } catch {
    return false;
  }
}

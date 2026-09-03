import type { Category } from "@prisma/client";
import { db } from "../lib/db.js";

export interface CategoryNode extends Category {
  children: CategoryNode[];
}

export async function listCategories(): Promise<CategoryNode[]> {
  const categories = await db.category.findMany({
    orderBy: { name: "asc" },
  });

  return buildTree(categories);
}

function buildTree(flat: Category[]): CategoryNode[] {
  const map = new Map<string, CategoryNode>();
  const roots: CategoryNode[] = [];

  for (const cat of flat) {
    map.set(cat.id, { ...cat, children: [] });
  }

  for (const cat of map.values()) {
    if (cat.parentId && map.has(cat.parentId)) {
      map.get(cat.parentId)!.children.push(cat);
    } else {
      roots.push(cat);
    }
  }

  return roots;
}
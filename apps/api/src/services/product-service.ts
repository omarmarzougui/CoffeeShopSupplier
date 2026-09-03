import { Prisma, type Product } from "@prisma/client";
import { db } from "../lib/db.js";
import { AppError } from "../lib/errors.js";
import { indexProduct, removeProduct, searchProducts } from "../lib/search.js";
import type {
  CreateProductInput,
  ListProductsQuery,
  UpdateProductInput,
} from "../schemas/product-schemas.js";

const PRODUCT_NOT_FOUND = new AppError(404, "PRODUCT_NOT_FOUND", "Product not found");

export interface ProductListResult {
  items: Product[];
  total: number;
  page: number;
  limit: number;
}

async function assertCategoryExists(categoryId: string): Promise<void> {
  const category = await db.category.findUnique({ where: { id: categoryId } });
  if (!category) {
    throw new AppError(400, "CATEGORY_NOT_FOUND", "Category does not exist");
  }
}

function toSearchDoc(product: Product): Record<string, unknown> {
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    description: product.description,
    categoryId: product.categoryId,
    supplierId: product.supplierId,
    price: product.price,
    currency: product.currency,
    unit: product.unit,
    minOrderQty: product.minOrderQty,
    leadTimeDays: product.leadTimeDays,
    stockAvailable: product.stockAvailable,
    images: product.images,
    archived: product.archived,
    createdAt: product.createdAt,
  };
}

export async function createProduct(supplierId: string, input: CreateProductInput): Promise<Product> {
  await assertCategoryExists(input.categoryId);
  try {
    const product = await db.product.create({ data: { ...input, supplierId } });
    await indexProduct(toSearchDoc(product));
    return product;
  } catch (err) {
    if (isUniqueSkuError(err)) {
      throw new AppError(409, "SKU_TAKEN", "A product with this SKU already exists");
    }
    throw err;
  }
}

export async function updateProduct(
  supplierId: string,
  productId: string,
  input: UpdateProductInput,
): Promise<Product> {
  const product = await getProductOwned(supplierId, productId);
  if (input.categoryId && input.categoryId !== product.categoryId) {
    await assertCategoryExists(input.categoryId);
  }
  try {
    const updated = await db.product.update({ where: { id: product.id }, data: input });
    await indexProduct(toSearchDoc(updated));
    return updated;
  } catch (err) {
    if (isUniqueSkuError(err)) {
      throw new AppError(409, "SKU_TAKEN", "A product with this SKU already exists");
    }
    throw err;
  }
}

export async function archiveProduct(supplierId: string, productId: string): Promise<Product> {
  const product = await getProductOwned(supplierId, productId);
  const archivedProduct = await db.product.update({
    where: { id: product.id },
    data: { archived: true },
  });
  await removeProduct(product.id);
  return archivedProduct;
}

export async function getProductOwned(
  supplierId: string,
  productId: string,
): Promise<Product> {
  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product || product.archived) {
    throw PRODUCT_NOT_FOUND;
  }
  if (product.supplierId !== supplierId) {
    throw PRODUCT_NOT_FOUND;
  }
  return product;
}

export async function getPublicProduct(productId: string): Promise<Product> {
  const product = await db.product.findUnique({
    where: { id: productId },
    include: { category: true, supplier: true },
  });
  if (!product || product.archived) {
    throw PRODUCT_NOT_FOUND;
  }
  return product as Product & { category: object; supplier: object };
}

export async function listProducts(query: ListProductsQuery): Promise<ProductListResult> {
  const { page, limit, minPrice, maxPrice, sort } = query;

  const hasTextSearch = (query.q?.trim().length ?? 0) > 0;

  const searchFilters: string[] = [];
  if (query.category) searchFilters.push(`categoryId = "${query.category}"`);
  if (query.supplier) searchFilters.push(`supplierId = "${query.supplier}"`);
  if (minPrice !== undefined) searchFilters.push(`price >= ${minPrice}`);
  if (maxPrice !== undefined) searchFilters.push(`price <= ${maxPrice}`);

  let searchIds: string[] | undefined;
  if (hasTextSearch) {
    const result = await searchProducts(query.q!, { filters: searchFilters });
    searchIds = result.hits.map((h) => String(h.id));
  }

  const where: Prisma.ProductWhereInput = {
    archived: false,
    ...(searchIds !== undefined && { id: { in: searchIds } }),
    ...(query.category && { categoryId: query.category }),
    ...(query.supplier && { supplierId: query.supplier }),
    ...((minPrice !== undefined || maxPrice !== undefined) && {
      price: {
        ...(minPrice !== undefined && { gte: minPrice }),
        ...(maxPrice !== undefined && { lte: maxPrice }),
      },
    }),
  };

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === "price_asc"
      ? { price: "asc" }
      : sort === "price_desc"
        ? { price: "desc" }
        : sort === "oldest"
          ? { createdAt: "asc" }
          : { createdAt: "desc" };

  const [items, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.product.count({ where }),
  ]);

  return { items, total, page, limit };
}

function isUniqueSkuError(err: unknown): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2002") {
    return false;
  }
  const target = err.meta?.target as string[] | undefined;
  return target?.includes("sku") ?? false;
}
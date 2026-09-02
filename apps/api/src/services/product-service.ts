import { Prisma, type Product } from "@prisma/client";
import { db } from "../lib/db.js";
import { AppError } from "../lib/errors.js";
import type { CreateProductInput, UpdateProductInput } from "../schemas/product-schemas.js";

const PRODUCT_NOT_FOUND = new AppError(404, "PRODUCT_NOT_FOUND", "Product not found");

async function assertCategoryExists(categoryId: string): Promise<void> {
  const category = await db.category.findUnique({ where: { id: categoryId } });
  if (!category) {
    throw new AppError(400, "CATEGORY_NOT_FOUND", "Category does not exist");
  }
}

export async function createProduct(supplierId: string, input: CreateProductInput): Promise<Product> {
  await assertCategoryExists(input.categoryId);
  try {
    return await db.product.create({ data: { ...input, supplierId } });
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
    return await db.product.update({ where: { id: product.id }, data: input });
  } catch (err) {
    if (isUniqueSkuError(err)) {
      throw new AppError(409, "SKU_TAKEN", "A product with this SKU already exists");
    }
    throw err;
  }
}

export async function archiveProduct(supplierId: string, productId: string): Promise<Product> {
  const product = await getProductOwned(supplierId, productId);
  return db.product.update({ where: { id: product.id }, data: { archived: true } });
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

function isUniqueSkuError(err: unknown): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2002") {
    return false;
  }
  const target = err.meta?.target as string[] | undefined;
  return target?.includes("sku") ?? false;
}

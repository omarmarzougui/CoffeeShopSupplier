import type { ProductUnit } from "@coffee/types";
import { apiFetch } from "../lib/api";

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children: Category[];
}

export interface Product {
  id: string;
  supplierId: string;
  categoryId: string;
  name: string;
  sku: string;
  description: string | null;
  unit: ProductUnit;
  price: number;
  currency: string;
  minOrderQty: number;
  leadTimeDays: number;
  stockAvailable: boolean;
  images: string[];
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  category?: Category;
  supplier?: { id: string; businessName: string };
}

export interface ProductListItem {
  id: string;
  supplierId: string;
  categoryId: string;
  name: string;
  sku: string;
  description: string | null;
  unit: ProductUnit;
  price: number;
  currency: string;
  minOrderQty: number;
  leadTimeDays: number;
  stockAvailable: boolean;
  images: string[];
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductListResponse {
  items: ProductListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface SupplierProfile {
  id: string;
  businessName: string;
  logoUrl: string | null;
  phone: string | null;
  address: string | null;
  verified: boolean;
  productCount: number;
}

export type ProductSort = "price_asc" | "price_desc" | "newest" | "oldest";

export interface ListProductsParams {
  category?: string;
  supplier?: string;
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
  sort?: ProductSort;
}

export async function fetchCategories(): Promise<Category[]> {
  return apiFetch<Category[]>("/api/v1/categories");
}

export async function fetchProducts(
  params: ListProductsParams = {},
): Promise<ProductListResponse> {
  const query = new URLSearchParams();
  if (params.category) query.set("category", params.category);
  if (params.supplier) query.set("supplier", params.supplier);
  if (params.q) query.set("q", params.q);
  if (params.minPrice !== undefined) query.set("minPrice", String(params.minPrice));
  if (params.maxPrice !== undefined) query.set("maxPrice", String(params.maxPrice));
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.sort) query.set("sort", params.sort);
  const qs = query.toString();
  return apiFetch<ProductListResponse>(`/api/v1/products${qs ? `?${qs}` : ""}`);
}

export async function fetchProduct(id: string): Promise<Product> {
  return apiFetch<Product>(`/api/v1/products/${id}`);
}

export async function fetchSupplier(id: string): Promise<SupplierProfile> {
  return apiFetch<SupplierProfile>(`/api/v1/suppliers/${id}`);
}

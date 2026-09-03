import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatMinorUnits } from "@coffee/utils";
import { fetchCategories, fetchProducts, type Category, type ProductSort } from "../lib/catalog";

function CategoryTree({ categories, activeId }: { categories: Category[]; activeId: string | null }) {
  return (
    <ul className="space-y-1">
      {categories.map((cat) => (
        <li key={cat.id}>
          <Link
            to={`/buyer/products?category=${cat.id}`}
            className={`block w-full rounded-lg px-3 py-1.5 text-sm transition-colors ${
              activeId === cat.id
                ? "bg-amber-100 font-medium text-amber-900"
                : "text-stone-700 hover:bg-stone-100 hover:text-stone-900"
            }`}
          >
            {cat.name}
          </Link>
          {cat.children.length > 0 && (
            <ul className="ml-4 mt-1 space-y-1">
              {cat.children.map((child) => (
                <li key={child.id}>
                  <Link
                    to={`/buyer/products?category=${child.id}`}
                    className={`block w-full rounded-lg px-3 py-1.5 text-sm transition-colors ${
                      activeId === child.id
                        ? "bg-amber-100 font-medium text-amber-900"
                        : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                    }`}
                  >
                    {child.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get("category");
  const supplier = searchParams.get("supplier");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<ProductSort>(
    (searchParams.get("sort") as ProductSort) ?? "newest",
  );

  const { data: categories, isLoading: loadingCategories } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const { data: productList, isLoading } = useQuery({
    queryKey: ["products", { category, supplier, q: search, sort }],
    queryFn: () => fetchProducts({ category: category ?? undefined, supplier: supplier ?? undefined, q: search || undefined, sort, limit: 20 }),
  });

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
  };

  const handleSort = (value: string) => {
    const next = value as ProductSort;
    setSort(next);
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (next === "newest") params.delete("sort");
      else params.set("sort", next);
      return params;
    });
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-stone-800">Browse Products</h1>
      <div className="flex gap-6">
        <aside className="w-64 shrink-0">
          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
              Categories
            </h3>
            {supplier && (
              <button
                onClick={() => setSearchParams({})}
                className="mb-2 text-xs text-amber-700 underline"
              >
                Clear supplier filter
              </button>
            )}
            {loadingCategories ? (
              <p className="text-sm text-stone-400">Loading...</p>
            ) : (
              <>
                <Link
                  to="/buyer/products"
                  className={`block w-full rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    !category && !supplier
                      ? "bg-amber-100 font-medium text-amber-900"
                      : "text-stone-700 hover:bg-stone-100 hover:text-stone-900"
                  }`}
                >
                  All Products
                </Link>
                <CategoryTree categories={categories ?? []} activeId={category} />
              </>
            )}
          </div>
        </aside>
        <main className="flex-1">
          <form onSubmit={handleSearch} className="mb-4 flex gap-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="flex-1 rounded-lg border border-stone-300 px-4 py-2 text-sm focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
            />
            <select
              value={sort}
              onChange={(e) => handleSort(e.target.value)}
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-600 focus:outline-none"
            >
              <option value="newest">Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="oldest">Oldest</option>
            </select>
          </form>

          {isLoading ? (
            <p className="py-8 text-center text-stone-400">Loading products...</p>
          ) : productList && productList.items.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {productList.items.map((p) => (
                <Link
                  key={p.id}
                  to={`/buyer/products/${p.id}`}
                  className="rounded-xl border border-stone-200 bg-white p-4 transition-shadow hover:shadow-md"
                >
                  <div
                    className="mb-3 flex h-32 items-center justify-center rounded-lg bg-stone-100 text-3xl"
                    aria-hidden
                  >
                    ☕
                  </div>
                  <h2 className="font-semibold text-stone-800">{p.name}</h2>
                  <p className="mt-1 text-sm text-stone-500">
                    {p.sku} · per {p.unit}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-bold text-amber-700">
                      {formatMinorUnits(p.price, p.currency)}
                    </span>
                    <span className="text-xs text-stone-500">MOQ {p.minOrderQty}</span>
                  </div>
                  {!p.stockAvailable && (
                    <span className="mt-2 inline-block rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600">
                      Out of stock
                    </span>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-stone-400">
              No products found{search ? ` for "${search}"` : ""}.
            </p>
          )}
        </main>
      </div>
    </div>
  );
}

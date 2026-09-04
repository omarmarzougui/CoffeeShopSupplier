import { useState, useEffect, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatMinorUnits } from "@coffee/utils";
import { fetchCategories, fetchProducts, type Category, type ProductSort } from "../lib/catalog";
import { PageHeader } from "../components/ui/page-header";
import { Input, Select } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Skeleton } from "../components/ui/skeleton";
import { EmptyState } from "../components/ui/empty-state";

function CategoryTree({ categories, activeId }: { categories: Category[]; activeId: string | null }) {
  return (
    <ul className="space-y-0.5">
      {categories.map((cat) => (
        <li key={cat.id}>
          <Link
            to={`/buyer/products?category=${cat.id}`}
            aria-current={activeId === cat.id ? "true" : undefined}
            className={`block rounded-md px-2.5 py-1.5 text-sm transition-colors ${
              activeId === cat.id
                ? "bg-stone-900 font-medium text-white"
                : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
            }`}
          >
            {cat.name}
          </Link>
          {cat.children.length > 0 && (
            <ul className="ml-3 mt-0.5 space-y-0.5 border-l border-stone-200 pl-2">
              {cat.children.map((child) => (
                <li key={child.id}>
                  <Link
                    to={`/buyer/products?category=${child.id}`}
                    aria-current={activeId === child.id ? "true" : undefined}
                    className={`block rounded-md px-2.5 py-1 text-sm transition-colors ${
                      activeId === child.id
                        ? "bg-stone-900 font-medium text-white"
                        : "text-stone-500 hover:bg-stone-100 hover:text-stone-900"
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
  const sortParam = searchParams.get("sort") as ProductSort | null;
  const qParam = searchParams.get("q") ?? "";

  const [search, setSearch] = useState(qParam);
  const [sort, setSort] = useState<ProductSort>(sortParam ?? "newest");

  useEffect(() => {
    setSearch(qParam);
  }, [qParam]);

  useEffect(() => {
    setSort(sortParam ?? "newest");
  }, [sortParam]);

  const { data: categories, isLoading: loadingCategories } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const { data: productList, isLoading } = useQuery({
    queryKey: ["products", { category, supplier, q: qParam, sort }],
    queryFn: () =>
      fetchProducts({
        category: category ?? undefined,
        supplier: supplier ?? undefined,
        q: qParam || undefined,
        sort,
        limit: 20,
      }),
  });

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (search.trim()) params.set("q", search.trim());
      else params.delete("q");
      return params;
    });
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

  const clearFilters = () => {
    setSearch("");
    setSearchParams({});
  };

  return (
    <div>
      <PageHeader
        title="Catalog"
        description={
          supplier
            ? "Filtered by supplier — showing their products only."
            : "Browse products from verified suppliers. Search, filter and compare."
        }
      />

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-60">
          <div className="rounded-lg border border-stone-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                Categories
              </h3>
              {(category || supplier || qParam) && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-medium text-stone-600 underline decoration-stone-300 underline-offset-4 hover:text-stone-900 hover:decoration-stone-900"
                >
                  Clear
                </button>
              )}
            </div>

            {supplier && (
              <div className="mb-3 rounded-md bg-amber-50 px-2.5 py-2 text-xs text-amber-800">
                Supplier filter active —{" "}
                <button type="button" onClick={clearFilters} className="font-medium underline">
                  show all
                </button>
              </div>
            )}

            {loadingCategories ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-5/6" />
                <Skeleton className="h-6 w-4/6" />
              </div>
            ) : (
              <>
                <Link
                  to="/buyer/products"
                  aria-current={!category && !supplier ? "true" : undefined}
                  className={`mb-1 block rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                    !category && !supplier
                      ? "bg-stone-900 font-medium text-white"
                      : "text-stone-700 hover:bg-stone-100"
                  }`}
                >
                  All products
                </Link>
                <CategoryTree categories={categories ?? []} activeId={category} />
              </>
            )}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <form onSubmit={handleSearch} className="mb-4 flex gap-2">
            <div className="flex-1">
              <label htmlFor="catalog-search" className="sr-only">
                Search products
              </label>
              <Input
                id="catalog-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, SKU…"
                aria-label="Search products"
              />
            </div>
            <Button type="submit" variant="secondary">
              Search
            </Button>
            <label htmlFor="catalog-sort" className="sr-only">
              Sort
            </label>
            <Select
              id="catalog-sort"
              value={sort}
              onChange={(e) => handleSort(e.target.value)}
              className="w-44"
              aria-label="Sort products"
            >
              <option value="newest">Newest</option>
              <option value="price_asc">Price: Low → High</option>
              <option value="price_desc">Price: High → Low</option>
              <option value="oldest">Oldest</option>
            </Select>
          </form>

          {isLoading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-stone-200 bg-white p-4">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="mt-3 h-4 w-3/4" />
                  <Skeleton className="mt-2 h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : productList && productList.items.length > 0 ? (
            <>
              <p className="mb-3 text-xs text-stone-500">
                {productList.total} product{productList.total === 1 ? "" : "s"} · page {productList.page} of{" "}
                {Math.max(1, Math.ceil(productList.total / productList.limit))}
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {productList.items.map((p) => (
                  <Link
                    key={p.id}
                    to={`/buyer/products/${p.id}`}
                    className="group flex flex-col rounded-lg border border-stone-200 bg-white p-4 transition-colors hover:border-stone-300 hover:bg-stone-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-1"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="line-clamp-2 text-sm font-medium leading-5 text-stone-900 group-hover:text-stone-900">
                        {p.name}
                      </h2>
                      {!p.stockAvailable && <Badge variant="danger">Out of stock</Badge>}
                    </div>

                    <p className="mt-1 text-xs text-stone-500">
                      {p.sku} · {p.unit}
                    </p>

                    <div className="mt-3 flex items-baseline justify-between gap-2 border-t border-stone-100 pt-3">
                      <span className="text-sm font-semibold tabular-nums text-stone-900">
                        {formatMinorUnits(p.price, p.currency)}
                      </span>
                      <span className="text-xs text-stone-500">MOQ {p.minOrderQty}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <EmptyState
              title="No products found"
              description={
                qParam || category || supplier
                  ? `No results for the current filters${qParam ? ` “${qParam}”` : ""}. Try adjusting your search or clear filters.`
                  : "No products are available yet."
              }
              action={
                qParam || category || supplier
                  ? { label: "Clear filters", onClick: clearFilters }
                  : undefined
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}

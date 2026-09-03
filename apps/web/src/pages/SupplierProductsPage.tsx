import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  archiveProduct,
  createProduct,
  fetchCategories,
  fetchProducts,
} from "../lib/catalog";
import { useAuthStore } from "../stores/auth-store";
import type { ProductUnit } from "@coffee/types";

const UNITS: ProductUnit[] = ["kg", "l", "case", "box", "unit"];

const EMPTY_FORM = {
  name: "",
  sku: "",
  categoryId: "",
  unit: "unit" as ProductUnit,
  price: "",
  currency: "TND",
  minOrderQty: "1",
  leadTimeDays: "1",
  stockAvailable: true,
  description: "",
};

export function SupplierProductsPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const { data: productsData, isLoading } = useQuery({
    queryKey: ["supplier-products"],
    queryFn: () =>
      user?.id ? fetchProducts({ limit: 100, supplier: user.id }) : fetchProducts({ limit: 100 }),
    enabled: !!user?.id,
  });

  useEffect(() => {
    const firstCategoryId = categories?.[0]?.id;
    if (firstCategoryId && !form.categoryId) {
      setForm((f) => ({ ...f, categoryId: firstCategoryId }));
    }
  }, [categories, form.categoryId]);

  const handleChange = (
    field: keyof typeof EMPTY_FORM,
    value: string | boolean | number,
  ) => {
    setForm((f) => ({ ...f, [field]: value } as typeof EMPTY_FORM));
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const price = Math.round(Number(form.price) * 1000);
    if (!form.name.trim() || !form.sku.trim() || !form.categoryId) {
      setError("Name, SKU and category are required.");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setError("Enter a valid price (in TND).");
      return;
    }

    setSubmitting(true);
    try {
      await createProduct({
        name: form.name.trim(),
        sku: form.sku.trim(),
        categoryId: form.categoryId,
        unit: form.unit,
        price,
        currency: form.currency,
        minOrderQty: Math.max(1, Number(form.minOrderQty) || 1),
        leadTimeDays: Math.max(0, Number(form.leadTimeDays) || 0),
        stockAvailable: form.stockAvailable,
        description: form.description.trim() || undefined,
      });
      setForm({ ...EMPTY_FORM, categoryId: form.categoryId });
      setSuccess("Product added successfully.");
      await queryClient.invalidateQueries({ queryKey: ["supplier-products"] });
    } catch (err) {
      setError((err as Error).message || "Failed to add product.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await archiveProduct(id);
      await queryClient.invalidateQueries({ queryKey: ["supplier-products"] });
    } catch (err) {
      setError((err as Error).message || "Failed to archive product.");
    }
  };

  const inputClass =
    "w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 focus:border-amber-500 focus:outline-none";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-stone-800">My Products</h1>
        <p className="mt-1 text-sm text-stone-500">
          Add and manage your product listings.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm"
      >
        <h2 className="mb-4 text-lg font-semibold text-stone-800">Add a new product</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">Name</label>
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Espresso Beans 1kg"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">SKU</label>
            <input
              className={inputClass}
              value={form.sku}
              onChange={(e) => handleChange("sku", e.target.value)}
              placeholder="ESP-1KG"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">Category</label>
            <select
              className={inputClass}
              value={form.categoryId}
              onChange={(e) => handleChange("categoryId", e.target.value)}
            >
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">Unit</label>
            <select
              className={inputClass}
              value={form.unit}
              onChange={(e) => handleChange("unit", e.target.value as ProductUnit)}
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">
              Price (TND)
            </label>
            <input
              className={inputClass}
              type="number"
              step="0.001"
              min="0"
              value={form.price}
              onChange={(e) => handleChange("price", e.target.value)}
              placeholder="32.000"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm font-medium text-stone-700">
              <input
                type="checkbox"
                checked={form.stockAvailable}
                onChange={(e) => handleChange("stockAvailable", e.target.checked)}
                className="h-4 w-4 accent-amber-700"
              />
              In stock
            </label>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">
              Minimum order quantity
            </label>
            <input
              className={inputClass}
              type="number"
              min="1"
              value={form.minOrderQty}
              onChange={(e) => handleChange("minOrderQty", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">
              Lead time (days)
            </label>
            <input
              className={inputClass}
              type="number"
              min="0"
              value={form.leadTimeDays}
              onChange={(e) => handleChange("leadTimeDays", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-stone-700">Description</label>
            <textarea
              className={inputClass}
              rows={3}
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Optional product description"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="mt-4 rounded-lg bg-amber-700 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-800 disabled:opacity-50"
        >
          {submitting ? "Adding..." : "Add product"}
        </button>
      </form>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-stone-800">Your listings</h2>
        {isLoading ? (
          <p className="text-sm text-stone-500">Loading products...</p>
        ) : productsData && productsData.items.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 text-xs uppercase text-stone-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {productsData.items.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-medium text-stone-800">{p.name}</td>
                    <td className="px-4 py-3 text-stone-600">{p.sku}</td>
                    <td className="px-4 py-3 text-stone-600">{p.unit}</td>
                    <td className="px-4 py-3 text-stone-800">{(p.price / 1000).toFixed(3)} TND</td>
                    <td className="px-4 py-3">
                      {p.archived ? (
                        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">
                          Archived
                        </span>
                      ) : (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!p.archived && (
                        <button
                          onClick={() => handleArchive(p.id)}
                          className="text-xs text-stone-500 hover:text-red-600"
                        >
                          Archive
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-stone-500">You have no products yet. Add your first product above.</p>
        )}
      </div>
    </div>
  );
}

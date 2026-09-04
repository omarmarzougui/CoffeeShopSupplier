import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { archiveProduct, createProduct, fetchCategories, fetchProducts, updateProduct } from "../lib/catalog";
import { useAuthStore } from "../stores/auth-store";
import type { ProductUnit } from "@coffee/types";
import type { ProductListItem } from "../lib/catalog";
import { PageHeader } from "../components/ui/page-header";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input, Textarea, Select, Label } from "../components/ui/input";
import { StatusBadge } from "../components/ui/badge";
import { TableWrapper, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from "../components/ui/table";
import { Alert } from "../components/ui/alert";
import { Skeleton } from "../components/ui/skeleton";
import { EmptyState } from "../components/ui/empty-state";

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

function productToForm(p: ProductListItem) {
  return {
    name: p.name,
    sku: p.sku,
    categoryId: p.categoryId,
    unit: p.unit,
    price: String(p.price / 1000),
    currency: p.currency,
    minOrderQty: String(p.minOrderQty),
    leadTimeDays: String(p.leadTimeDays),
    stockAvailable: p.stockAvailable,
    description: p.description ?? "",
  };
}

export function SupplierProductsPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

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
    if (firstCategoryId && !form.categoryId && !editingId) {
      setForm((f) => ({ ...f, categoryId: firstCategoryId }));
    }
  }, [categories, form.categoryId, editingId]);

  const handleChange = (field: keyof typeof EMPTY_FORM, value: string | boolean) => {
    setForm((f) => ({ ...f, [field]: value }) as typeof EMPTY_FORM);
    setError(null);
    setSuccess(null);
  };

  const resetForm = () => {
    setForm({ ...EMPTY_FORM, categoryId: categories?.[0]?.id ?? "" });
    setEditingId(null);
    setError(null);
    setSuccess(null);
    setShowForm(false);
  };

  const startEdit = (p: ProductListItem) => {
    setForm(productToForm(p));
    setEditingId(p.id);
    setError(null);
    setSuccess(null);
    setShowForm(true);
  };

  const startCreate = () => {
    setForm({ ...EMPTY_FORM, categoryId: categories?.[0]?.id ?? "" });
    setEditingId(null);
    setError(null);
    setSuccess(null);
    setShowForm(true);
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
      if (editingId) {
        await updateProduct(editingId, {
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
        setSuccess("Product updated.");
      } else {
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
        setSuccess("Product added.");
      }
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ["supplier-products"] });
    } catch (err) {
      setError((err as Error).message || "Failed to save product.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await archiveProduct(id);
      if (editingId === id) resetForm();
      await queryClient.invalidateQueries({ queryKey: ["supplier-products"] });
    } catch (err) {
      setError((err as Error).message || "Failed to archive product.");
    }
  };

  return (
    <div>
      <PageHeader
        title="Products"
        description="Manage your catalog — prices, stock and availability."
        action={
          !showForm ? (
            <Button onClick={startCreate}>Add product</Button>
          ) : (
            <Button variant="secondary" onClick={resetForm}>
              Cancel
            </Button>
          )
        }
      />

      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
      {success && (
        <div className="mb-4">
          <Alert variant="success">{success}</Alert>
        </div>
      )}

      {showForm && (
        <Card className="mb-6">
          <h2 className="text-sm font-semibold text-stone-900">
            {editingId ? "Edit product" : "Add product"}
          </h2>
          <p className="mt-1 text-xs text-stone-500">
            Price is in TND (millimes stored as integer minor units).
          </p>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="p-name" required>
                  Product name
                </Label>
                <Input
                  id="p-name"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Espresso Beans 1kg"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="p-sku" required>
                  SKU
                </Label>
                <Input
                  id="p-sku"
                  value={form.sku}
                  onChange={(e) => handleChange("sku", e.target.value)}
                  placeholder="ESP-1KG"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="p-category" required>
                  Category
                </Label>
                <Select
                  id="p-category"
                  value={form.categoryId}
                  onChange={(e) => handleChange("categoryId", e.target.value)}
                >
                  {categories?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="p-unit">Unit</Label>
                <Select
                  id="p-unit"
                  value={form.unit}
                  onChange={(e) => handleChange("unit", e.target.value as ProductUnit)}
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="p-price" required>
                  Price (TND)
                </Label>
                <Input
                  id="p-price"
                  type="number"
                  step="0.001"
                  min="0"
                  value={form.price}
                  onChange={(e) => handleChange("price", e.target.value)}
                  placeholder="32.000"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Availability</Label>
                <label className="flex h-9 items-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm">
                  <input
                    type="checkbox"
                    checked={form.stockAvailable}
                    onChange={(e) => handleChange("stockAvailable", e.target.checked)}
                    className="h-4 w-4 accent-stone-900"
                  />
                  <span className="text-stone-700">In stock</span>
                </label>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="p-moq">Minimum order qty</Label>
                <Input
                  id="p-moq"
                  type="number"
                  min="1"
                  value={form.minOrderQty}
                  onChange={(e) => handleChange("minOrderQty", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="p-lead">Lead time (days)</Label>
                <Input
                  id="p-lead"
                  type="number"
                  min="0"
                  value={form.leadTimeDays}
                  onChange={(e) => handleChange("leadTimeDays", e.target.value)}
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="p-desc">Description</Label>
                <Textarea
                  id="p-desc"
                  rows={3}
                  value={form.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="Optional — materials, origin, notes for buyers"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? (editingId ? "Updating…" : "Adding…") : editingId ? "Update product" : "Add product"}
              </Button>
              <Button type="button" variant="secondary" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-500">
          Your listings — {productsData?.total ?? 0} product{(productsData?.total ?? 0) === 1 ? "" : "s"}
        </h2>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : productsData && productsData.items.length > 0 ? (
          <TableWrapper>
            <TableHead>
              <tr>
                <TableHeaderCell>Product</TableHeaderCell>
                <TableHeaderCell>SKU</TableHeaderCell>
                <TableHeaderCell>Unit</TableHeaderCell>
                <TableHeaderCell>Price</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell className="text-right">Actions</TableHeaderCell>
              </tr>
            </TableHead>
            <TableBody>
              {productsData.items.map((p) => (
                <TableRow key={p.id} className={editingId === p.id ? "bg-amber-50/50" : ""}>
                  <TableCell className="font-medium text-stone-900">{p.name}</TableCell>
                  <TableCell className="font-mono text-xs text-stone-600">{p.sku}</TableCell>
                  <TableCell className="text-stone-600">{p.unit}</TableCell>
                  <TableCell className="tabular-nums text-stone-900">{(p.price / 1000).toFixed(3)} TND</TableCell>
                  <TableCell>
                    <StatusBadge status={p.archived ? "archived" : "active"} />
                  </TableCell>
                  <TableCell className="text-right">
                    {!p.archived ? (
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => startEdit(p)}
                          className="text-xs font-medium text-stone-600 hover:text-stone-900 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleArchive(p.id)}
                          className="text-xs font-medium text-stone-400 hover:text-red-600"
                        >
                          Archive
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-stone-400">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </TableWrapper>
        ) : (
          <EmptyState
            title="No products yet"
            description="Add your first product to start receiving orders."
            action={showForm ? undefined : { label: "Add product", onClick: startCreate }}
          />
        )}
      </div>
    </div>
  );
}

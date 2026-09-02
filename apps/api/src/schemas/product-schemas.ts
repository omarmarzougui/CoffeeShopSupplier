import { z } from "zod";

const productUnitEnum = z.enum(["kg", "l", "case", "box", "unit"]);

export const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().min(1).max(64),
  categoryId: z.string().uuid(),
  unit: productUnitEnum,
  price: z.number().int().positive(),
  currency: z.string().length(3).default("TND"),
  minOrderQty: z.number().int().positive().default(1),
  leadTimeDays: z.number().int().min(0).max(365).default(1),
  stockAvailable: z.boolean().default(true),
  description: z.string().max(5000).optional(),
  images: z.array(z.string().url()).max(10).default([]),
});

export const updateProductSchema = z
  .object({
    name: z.string().min(1).max(200),
    sku: z.string().min(1).max(64),
    categoryId: z.string().uuid(),
    unit: productUnitEnum,
    price: z.number().int().positive(),
    currency: z.string().length(3),
    minOrderQty: z.number().int().positive(),
    leadTimeDays: z.number().int().min(0).max(365),
    stockAvailable: z.boolean(),
    description: z.string().max(5000),
    images: z.array(z.string().url()).max(10),
  })
  .partial()
  .refine((val) => Object.keys(val).length > 0, {
    message: "At least one field required",
  });

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

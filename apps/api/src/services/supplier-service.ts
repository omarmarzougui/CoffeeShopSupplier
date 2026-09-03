import { db } from "../lib/db.js";
import { AppError } from "../lib/errors.js";

const SUPPLIER_NOT_FOUND = new AppError(404, "SUPPLIER_NOT_FOUND", "Supplier not found");

export interface SupplierProfile {
  id: string;
  businessName: string;
  logoUrl: string | null;
  phone: string | null;
  address: string | null;
  verified: boolean;
  productCount: number;
}

export async function getSupplierProfile(supplierId: string): Promise<SupplierProfile> {
  const supplier = await db.user.findUnique({
    where: { id: supplierId },
    include: {
      _count: {
        select: {
          products: {
            where: { archived: false },
          },
        },
      },
    },
  });

  if (!supplier || supplier.role !== "supplier") {
    throw SUPPLIER_NOT_FOUND;
  }

  return {
    id: supplier.id,
    businessName: supplier.businessName,
    logoUrl: supplier.logoUrl,
    phone: supplier.phone,
    address: supplier.address,
    verified: supplier.verifiedAt !== null,
    productCount: supplier._count.products as number,
  };
}
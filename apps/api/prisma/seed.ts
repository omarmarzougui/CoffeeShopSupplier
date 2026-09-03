import bcrypt from "bcryptjs";
import { db } from "../src/lib/db.js";

interface CategorySpec {
  name: string;
  slug: string;
  children?: CategorySpec[];
}

const taxonomy: CategorySpec[] = [
  {
    name: "Coffee & Hot Beverages",
    slug: "coffee-hot-beverages",
    children: [
      { name: "Espresso Beans", slug: "espresso-beans" },
      { name: "Filter Coffee", slug: "filter-coffee" },
      { name: "Instant Coffee", slug: "instant-coffee" },
      { name: "Tea", slug: "tea" },
    ],
  },
  {
    name: "Dairy & Alternatives",
    slug: "dairy-alternatives",
    children: [
      { name: "Whole Milk", slug: "whole-milk" },
      { name: "Skim Milk", slug: "skim-milk" },
      { name: "Oat Milk", slug: "oat-milk" },
      { name: "Almond Milk", slug: "almond-milk" },
      { name: "Cream", slug: "cream" },
    ],
  },
  {
    name: "Sweeteners",
    slug: "sweeteners",
    children: [
      { name: "White Sugar", slug: "white-sugar" },
      { name: "Brown Sugar", slug: "brown-sugar" },
      { name: "Sweetener Sachets", slug: "sweetener-sachets" },
      { name: "Syrups", slug: "syrups" },
    ],
  },
  {
    name: "Cold Beverages",
    slug: "cold-beverages",
    children: [
      { name: "Still Water", slug: "still-water" },
      { name: "Sparkling Water", slug: "sparkling-water" },
      { name: "Soft Drinks", slug: "soft-drinks" },
      { name: "Energy Drinks", slug: "energy-drinks" },
    ],
  },
  {
    name: "Packaging & Cups",
    slug: "packaging-cups",
    children: [
      { name: "Hot Cups", slug: "hot-cups" },
      { name: "Cold Cups", slug: "cold-cups" },
      { name: "Lids", slug: "lids" },
      { name: "Sleeves", slug: "sleeves" },
      { name: "Carry Trays", slug: "carry-trays" },
      { name: "Bags & Napkins", slug: "bags-napkins" },
      { name: "Stirrers & Straws", slug: "stirrers-straws" },
    ],
  },
  {
    name: "Cleaning & Hygiene",
    slug: "cleaning-hygiene",
    children: [
      { name: "Espresso Machine Cleaner", slug: "espresso-machine-cleaner" },
      { name: "Descaling Products", slug: "descaling-products" },
      { name: "Surface Disinfectants", slug: "surface-disinfectants" },
      { name: "Hand Soap & Sanitizer", slug: "hand-soap-sanitizer" },
      { name: "Bin Liners", slug: "bin-liners" },
    ],
  },
  {
    name: "Other Supplies",
    slug: "other-supplies",
    children: [
      { name: "Filters", slug: "filters" },
      { name: "CO2 Canisters", slug: "co2-canisters" },
    ],
  },
];

async function seedCategories(): Promise<void> {
  for (const root of taxonomy) {
    const parent = await db.category.upsert({
      where: { slug: root.slug },
      update: { name: root.name },
      create: { name: root.name, slug: root.slug },
    });
    for (const child of root.children ?? []) {
      await db.category.upsert({
        where: { slug: child.slug },
        update: { name: child.name, parentId: parent.id },
        create: { name: child.name, slug: child.slug, parentId: parent.id },
      });
    }
  }
}

async function seedUsers(): Promise<void> {
  const demo = [
    { email: "admin@coffee.test", role: "admin" as const, businessName: "Platform Admin" },
    { email: "buyer@coffee.test", role: "buyer" as const, businessName: "Demo Coffee Shop" },
    { email: "supplier@coffee.test", role: "supplier" as const, businessName: "Demo Supplies Co" },
  ];
  const passwordHash = await bcrypt.hash("password123", 10);
  for (const u of demo) {
    await db.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash },
    });
  }
}

interface SupplierSpec {
  email: string;
  businessName: string;
  phone: string;
  address: string;
  vatId: string;
  products: Array<{
    name: string;
    sku: string;
    categorySlug: string;
    unit: ProductUnit;
    price: number;
    minOrderQty: number;
    leadTimeDays: number;
  }>;
}

type ProductUnit = "kg" | "l" | "case" | "box" | "unit";

const supplierSpecs: SupplierSpec[] = [
  {
    email: "beans@coffee.test",
    businessName: "Mena Roasters",
    phone: "+216 98 111 222",
    address: "Zone Industrielle, Sidi Daoud, La Marsa, Tunis",
    vatId: "TN-1234567",
    products: [
      { name: "Espresso Blend 1kg", sku: "MR-ESP-1", categorySlug: "espresso-beans", unit: "kg", price: 32000, minOrderQty: 5, leadTimeDays: 2 },
      { name: "Single Origin Yirgacheffe 1kg", sku: "MR-YIR-1", categorySlug: "filter-coffee", unit: "kg", price: 45000, minOrderQty: 2, leadTimeDays: 3 },
      { name: "House Filter Roast 250g", sku: "MR-FLT-250", categorySlug: "filter-coffee", unit: "unit", price: 9000, minOrderQty: 10, leadTimeDays: 1 },
      { name: "Decaf Espresso 1kg", sku: "MR-DEC-1", categorySlug: "espresso-beans", unit: "kg", price: 38000, minOrderQty: 2, leadTimeDays: 4 },
    ],
  },
  {
    email: "dairy@coffee.test",
    businessName: "Fresh Dairy Distributor",
    phone: "+216 50 333 444",
    address: "Lot 44, Charguia II, Tunis",
    vatId: "TN-7654321",
    products: [
      { name: "Whole Milk 1L", sku: "FD-WM-1", categorySlug: "whole-milk", unit: "case", price: 18000, minOrderQty: 12, leadTimeDays: 1 },
      { name: "Oat Milk 1L (Barista)", sku: "FD-OM-1", categorySlug: "oat-milk", unit: "case", price: 36000, minOrderQty: 6, leadTimeDays: 2 },
      { name: "Almond Milk 1L", sku: "FD-AM-1", categorySlug: "almond-milk", unit: "case", price: 34000, minOrderQty: 6, leadTimeDays: 2 },
      { name: "Whipping Cream 1L", sku: "FD-CR-1", categorySlug: "cream", unit: "case", price: 22000, minOrderQty: 6, leadTimeDays: 1 },
    ],
  },
  {
    email: "cups@coffee.test",
    businessName: "CupWorks Packaging",
    phone: "+216 22 555 666",
    address: "Route de la Soukra, Tunis",
    vatId: "TN-9988776",
    products: [
      { name: "Double Wall Hot Cup 12oz", sku: "CW-HC12", categorySlug: "hot-cups", unit: "box", price: 55000, minOrderQty: 4, leadTimeDays: 3 },
      { name: "Clear Cold Cup 16oz", sku: "CW-CC16", categorySlug: "cold-cups", unit: "box", price: 47000, minOrderQty: 4, leadTimeDays: 3 },
      { name: "Flat Lids 12oz", sku: "CW-LD12", categorySlug: "lids", unit: "box", price: 18000, minOrderQty: 10, leadTimeDays: 2 },
      { name: "Cardboard Carry Tray", sku: "CW-TRAY", categorySlug: "carry-trays", unit: "box", price: 39000, minOrderQty: 5, leadTimeDays: 4 },
    ],
  },
  {
    email: "syrup@coffee.test",
    businessName: "Gourmet Syrups ME",
    phone: "+216 55 777 888",
    address: "Av. Habib Bourguiba, Sfax",
    vatId: "TN-1122334",
    products: [
      { name: "Vanilla Syrup 1L", sku: "GS-VAN-1", categorySlug: "syrups", unit: "unit", price: 14000, minOrderQty: 12, leadTimeDays: 2 },
      { name: "Caramel Syrup 1L", sku: "GS-CAR-1", categorySlug: "syrups", unit: "unit", price: 14000, minOrderQty: 12, leadTimeDays: 2 },
      { name: "Hazelnut Syrup 1L", sku: "GS-HAZ-1", categorySlug: "syrups", unit: "unit", price: 15000, minOrderQty: 12, leadTimeDays: 2 },
      { name: "White Sugar Sachets (500x5g)", sku: "GS-SUG-500", categorySlug: "white-sugar", unit: "box", price: 13000, minOrderQty: 5, leadTimeDays: 1 },
    ],
  },
  {
    email: "clean@coffee.test",
    businessName: "HygienePro Supplies",
    phone: "+216 29 444 555",
    address: "Zone Urbaine Nord, Tunis",
    vatId: "TN-5566778",
    products: [
      { name: "Espresso Machine Cleaner 1L", sku: "HP-EMC-1", categorySlug: "espresso-machine-cleaner", unit: "unit", price: 26000, minOrderQty: 6, leadTimeDays: 2 },
      { name: "Descaling Powder 500g", sku: "HP-DSC-500", categorySlug: "descaling-products", unit: "unit", price: 12000, minOrderQty: 6, leadTimeDays: 2 },
      { name: "Surface Disinfectant 5L", sku: "HP-DIS-5", categorySlug: "surface-disinfectants", unit: "unit", price: 33000, minOrderQty: 4, leadTimeDays: 3 },
      { name: "Bin Liners (100 pack)", sku: "HP-BIN-100", categorySlug: "bin-liners", unit: "box", price: 21000, minOrderQty: 3, leadTimeDays: 1 },
    ],
  },
];

async function seedSuppliers(): Promise<void> {
  const passwordHash = await bcrypt.hash("password123", 10);
  for (const spec of supplierSpecs) {
    const supplier = await db.user.upsert({
      where: { email: spec.email },
      update: {
        businessName: spec.businessName,
        phone: spec.phone,
        address: spec.address,
        vatId: spec.vatId,
      },
      create: {
        email: spec.email,
        passwordHash,
        role: "supplier",
        businessName: spec.businessName,
        phone: spec.phone,
        address: spec.address,
        vatId: spec.vatId,
      },
    });

    for (const product of spec.products) {
      const category = await db.category.findUnique({ where: { slug: product.categorySlug } });
      if (!category) {
        console.warn(`seed: category '${product.categorySlug}' not found, skipping ${product.name}`);
        continue;
      }
      await db.product.upsert({
        where: { supplierId_sku: { supplierId: supplier.id, sku: product.sku } },
        update: {
          name: product.name,
          categoryId: category.id,
          unit: product.unit,
          price: product.price,
          minOrderQty: product.minOrderQty,
          leadTimeDays: product.leadTimeDays,
        },
        create: {
          supplierId: supplier.id,
          categoryId: category.id,
          name: product.name,
          sku: product.sku,
          unit: product.unit,
          price: product.price,
          minOrderQty: product.minOrderQty,
          leadTimeDays: product.leadTimeDays,
        },
      });
    }
  }
}

async function main(): Promise<void> {
  console.log("Seeding categories...");
  await seedCategories();
  console.log("Seeding demo users (password: password123)...");
  await seedUsers();
  console.log("Seeding suppliers & products...");
  await seedSuppliers();
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

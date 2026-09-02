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

async function main(): Promise<void> {
  console.log("Seeding categories...");
  await seedCategories();
  console.log("Seeding demo users (password: password123)...");
  await seedUsers();
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

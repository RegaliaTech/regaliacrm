"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole, WRITE_ROLES } from "@/lib/rbac";

const imageSchema = z.object({
  url: z.string().min(1),
  caption: z.string().optional().nullable(),
});

const specSchema = z.object({
  key: z.string(),
  value: z.string(),
});

const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  kind: z.enum(["MODEL", "PHOTOGRAPHER", "RENTAL", "CUSTOM"]),
  sku: z.string().optional(),
  model: z.string().optional(),
  figure: z.string().optional(),
  category: z.string().optional(),
  tier: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.enum(["BASIC", "AMATEUR", "PRO"]).optional(),
  ),
  description: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
  nationality: z.string().optional(),
  languages: z.string().optional(),
  currency: z.string().default("AED"),
  coverImage: z.string().optional(),
  unitPrice: z.coerce.number().min(0).default(0),
  unitCost: z.coerce.number().min(0).default(0),
  dailyRate: z.coerce.number().min(0).optional(),
  weeklyRate: z.coerce.number().min(0).optional(),
  deposit: z.coerce.number().min(0).optional(),
  qtyTotal: z.coerce.number().int().min(0).optional(),
  qtyOnRent: z.coerce.number().int().min(0).default(0),
  isBespoke: z.coerce.boolean().default(false),
  leadTimeDays: z.coerce.number().int().min(0).optional(),
  isActive: z.coerce.boolean().default(true),
});

export type ProductFormState = { error?: string };

function parseJson<T>(raw: FormDataEntryValue | null, fallback: T): T {
  if (typeof raw !== "string" || !raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function slugify(s: string): string {
  return s
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}

export async function saveProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireRole(WRITE_ROLES);

  const parsed = productSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;

  const images = parseJson<z.infer<typeof imageSchema>[]>(
    formData.get("images"),
    [],
  ).filter((i) => imageSchema.safeParse(i).success);
  const specEntries = parseJson<z.infer<typeof specSchema>[]>(
    formData.get("specs"),
    [],
  ).filter((s) => s.key.trim());
  const specs =
    specEntries.length > 0
      ? Object.fromEntries(specEntries.map((s) => [s.key.trim(), s.value]))
      : undefined;

  const coverImage = d.coverImage || images[0]?.url || undefined;
  const isRental = d.kind === "RENTAL";
  const isCustom = d.kind === "CUSTOM";
  const isTalent = d.kind === "MODEL" || d.kind === "PHOTOGRAPHER";

  const languages = isTalent
    ? (d.languages ?? "")
        .split(",")
        .map((l) => l.trim())
        .filter(Boolean)
    : [];

  const data = {
    name: d.name,
    kind: d.kind,
    model: d.model || null,
    figure: d.figure || null,
    category: d.category || null,
    tier: d.tier ?? null,
    description: d.description || null,
    height: isTalent ? d.height || null : null,
    weight: isTalent ? d.weight || null : null,
    nationality: isTalent ? d.nationality || null : null,
    languages,
    currency: d.currency || "AED",
    coverImage: coverImage ?? null,
    specs: specs ?? undefined,
    unitPrice: d.unitPrice,
    unitCost: d.unitCost,
    isActive: d.isActive,
    dailyRate: isRental ? (d.dailyRate ?? 0) : null,
    weeklyRate: isRental ? (d.weeklyRate ?? 0) : null,
    deposit: isRental ? (d.deposit ?? 0) : null,
    qtyTotal: isRental ? (d.qtyTotal ?? 0) : null,
    qtyOnRent: isRental ? d.qtyOnRent : 0,
    isBespoke: isCustom ? true : d.isBespoke,
    leadTimeDays: isCustom ? (d.leadTimeDays ?? null) : null,
  };

  let productId = d.id;
  try {
    if (d.id) {
      await prisma.product.update({ where: { id: d.id }, data });
      await prisma.productImage.deleteMany({ where: { productId: d.id } });
      if (images.length) {
        await prisma.productImage.createMany({
          data: images.map((img, i) => ({
            productId: d.id!,
            url: img.url,
            caption: img.caption || null,
            position: i,
          })),
        });
      }
    } else {
      const sku =
        (d.sku && slugify(d.sku)) ||
        `${d.kind.slice(0, 3)}-${slugify(d.name)}-${Date.now()
          .toString()
          .slice(-4)}`;
      const created = await prisma.product.create({
        data: {
          ...data,
          sku,
          images: {
            create: images.map((img, i) => ({
              url: img.url,
              caption: img.caption || null,
              position: i,
            })),
          },
        },
      });
      productId = created.id;
    }
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to save product",
    };
  }

  revalidatePath("/products");
  if (productId) revalidatePath(`/products/${productId}`);
  redirect(productId ? `/products/${productId}` : "/products");
}

export type CategoryFormState = { error?: string };

export async function createCategory(
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  await requireRole(WRITE_ROLES);
  const name = (formData.get("name")?.toString() ?? "").trim();
  if (!name) return { error: "Category name is required" };
  try {
    await prisma.productCategory.upsert({
      where: { name },
      create: { name },
      update: {},
    });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to add category",
    };
  }
  revalidatePath("/products");
  revalidatePath("/products/new");
  return {};
}

export async function deleteCategory(formData: FormData): Promise<void> {
  await requireRole(WRITE_ROLES);
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return;
  try {
    await prisma.productCategory.delete({ where: { id } });
  } catch {
    // ignore — DB may be offline in preview
  }
  revalidatePath("/products");
}

export async function deleteProduct(formData: FormData): Promise<void> {
  await requireRole(WRITE_ROLES);
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return;
  try {
    await prisma.product.delete({ where: { id } });
  } catch {
    // ignore — DB may be offline in preview
  }
  revalidatePath("/products");
  redirect("/products");
}

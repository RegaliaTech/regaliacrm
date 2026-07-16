"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import type { ProductView } from "@/lib/products";
import {
  saveProduct,
  type ProductFormState,
} from "@/app/(app)/products/actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { buttonClasses } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormError } from "@/components/ui/form-error";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ImageUploader,
  type AlbumImage,
} from "@/components/products/image-uploader";
import type { ProductKind } from "@prisma/client";

type SpecRow = { key: string; value: string };

export function ProductForm({
  product,
  categories = [],
}: {
  product?: ProductView;
  categories?: string[];
}) {
  const [state, formAction, pending] = useActionState<
    ProductFormState,
    FormData
  >(saveProduct, {});

  const [kind, setKind] = React.useState<ProductKind>(product?.kind ?? "MODEL");
  // Show the product's current category even if it predates the managed list.
  const categoryOptions = React.useMemo(() => {
    const set = new Set(categories);
    if (product?.category) set.add(product.category);
    return [...set];
  }, [categories, product?.category]);
  const [images, setImages] = React.useState<AlbumImage[]>(
    product?.images.map((i) => ({ url: i.url, caption: i.caption ?? "" })) ??
      [],
  );
  const [specs, setSpecs] = React.useState<SpecRow[]>(
    product?.specs
      ? Object.entries(product.specs).map(([key, value]) => ({
          key,
          value: String(value),
        }))
      : [{ key: "", value: "" }],
  );

  const isRental = kind === "RENTAL";
  const isCustom = kind === "CUSTOM";
  const isTalent = kind === "MODEL" || kind === "PHOTOGRAPHER";

  return (
    <form action={formAction} className="space-y-6">
      {product && <input type="hidden" name="id" value={product.id} />}
      <input
        type="hidden"
        name="images"
        value={JSON.stringify(images.filter((i) => i.url))}
      />
      <input
        type="hidden"
        name="specs"
        value={JSON.stringify(specs.filter((s) => s.key.trim()))}
      />
      <input
        type="hidden"
        name="coverImage"
        value={images[0]?.url ?? ""}
      />

      <FormError error={state.error} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Basics */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    required
                    defaultValue={product?.name}
                    placeholder="Eternity Gown"
                  />
                </div>
                <div>
                  <Label htmlFor="kind">Type</Label>
                  <Select
                    id="kind"
                    name="kind"
                    value={kind}
                    onChange={(e) => setKind(e.target.value as ProductKind)}
                  >
                    <option value="MODEL">Model / Host</option>
                    <option value="PHOTOGRAPHER">Photographer</option>
                    <option value="RENTAL">Equipment Rental</option>
                    <option value="CUSTOM">Custom Product</option>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    name="model"
                    defaultValue={product?.model ?? ""}
                    placeholder="ETERNITY"
                  />
                </div>
                <div>
                  <Label htmlFor="figure">Figure / silhouette</Label>
                  <Input
                    id="figure"
                    name="figure"
                    defaultValue={product?.figure ?? ""}
                    placeholder="A-Line"
                  />
                </div>
                <div>
                  <Label htmlFor="tier">Tier</Label>
                  <Select
                    id="tier"
                    name="tier"
                    defaultValue={product?.tier ?? ""}
                  >
                    <option value="">— None —</option>
                    <option value="BASIC">Basic</option>
                    <option value="AMATEUR">Amateur</option>
                    <option value="PRO">Pro</option>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    id="category"
                    name="category"
                    defaultValue={product?.category ?? ""}
                  >
                    <option value="">— Select category —</option>
                    {categoryOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </div>
                {!product && (
                  <div>
                    <Label htmlFor="sku">SKU (optional)</Label>
                    <Input
                      id="sku"
                      name="sku"
                      placeholder="Auto-generated if blank"
                    />
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  rows={3}
                  defaultValue={product?.description ?? ""}
                  placeholder="Describe the product…"
                />
              </div>
            </CardContent>
          </Card>

          {/* Talent profile (model / host / photographer) */}
          {isTalent && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {kind === "PHOTOGRAPHER" ? "Photographer profile" : "Model / host profile"}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 pt-0 sm:grid-cols-2">
                <div>
                  <Label htmlFor="height">Height</Label>
                  <Input
                    id="height"
                    name="height"
                    defaultValue={product?.height ?? ""}
                    placeholder="178 cm"
                  />
                </div>
                <div>
                  <Label htmlFor="weight">Weight</Label>
                  <Input
                    id="weight"
                    name="weight"
                    defaultValue={product?.weight ?? ""}
                    placeholder="58 kg"
                  />
                </div>
                <div>
                  <Label htmlFor="nationality">Nationality</Label>
                  <Input
                    id="nationality"
                    name="nationality"
                    defaultValue={product?.nationality ?? ""}
                    placeholder="Italian"
                  />
                </div>
                <div>
                  <Label htmlFor="languages">Languages</Label>
                  <Input
                    id="languages"
                    name="languages"
                    defaultValue={product?.languages?.join(", ") ?? ""}
                    placeholder="English, Arabic, French"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Album */}
          <Card>
            <CardHeader>
              <CardTitle>Album</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ImageUploader value={images} onChange={setImages} />
            </CardContent>
          </Card>
          {/* Specs */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">              <CardTitle>Specifications</CardTitle>
              <button
                type="button"
                onClick={() => setSpecs([...specs, { key: "", value: "" }])}
                className="inline-flex items-center gap-1 text-sm font-medium text-[var(--primary)] hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {specs.map((row, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={row.key}
                    onChange={(e) =>
                      setSpecs(
                        specs.map((s, idx) =>
                          idx === i ? { ...s, key: e.target.value } : s,
                        ),
                      )
                    }
                    placeholder="Fabric"
                  />
                  <Input
                    value={row.value}
                    onChange={(e) =>
                      setSpecs(
                        specs.map((s, idx) =>
                          idx === i ? { ...s, value: e.target.value } : s,
                        ),
                      )
                    }
                    placeholder="Italian Mikado"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setSpecs(specs.filter((_, idx) => idx !== i))
                    }
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-[var(--danger)]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: pricing */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{isRental ? "Rental rates" : "Pricing"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  name="currency"
                  defaultValue={product?.currency ?? "AED"}
                />
              </div>

              {isRental ? (
                <>
                  <div>
                    <Label htmlFor="dailyRate">Daily rate</Label>
                    <Input
                      id="dailyRate"
                      name="dailyRate"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={product?.dailyRate ?? ""}
                    />
                  </div>
                  <div>
                    <Label htmlFor="weeklyRate">Weekly rate</Label>
                    <Input
                      id="weeklyRate"
                      name="weeklyRate"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={product?.weeklyRate ?? ""}
                    />
                  </div>
                  <div>
                    <Label htmlFor="deposit">Deposit</Label>
                    <Input
                      id="deposit"
                      name="deposit"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={product?.deposit ?? ""}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="qtyTotal">Units owned</Label>
                      <Input
                        id="qtyTotal"
                        name="qtyTotal"
                        type="number"
                        min="0"
                        defaultValue={product?.qtyTotal ?? ""}
                      />
                    </div>
                    <div>
                      <Label htmlFor="qtyOnRent">On rent</Label>
                      <Input
                        id="qtyOnRent"
                        name="qtyOnRent"
                        type="number"
                        min="0"
                        defaultValue={product?.qtyOnRent ?? 0}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label htmlFor="unitPrice">Price</Label>
                    <Input
                      id="unitPrice"
                      name="unitPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={product?.unitPrice ?? 0}
                    />
                  </div>
                  <div>
                    <Label htmlFor="unitCost">Cost</Label>
                    <Input
                      id="unitCost"
                      name="unitCost"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={product?.unitCost ?? 0}
                    />
                  </div>
                  {isCustom && (
                    <div>
                      <Label htmlFor="leadTimeDays">Lead time (days)</Label>
                      <Input
                        id="leadTimeDays"
                        name="leadTimeDays"
                        type="number"
                        min="0"
                        defaultValue={product?.leadTimeDays ?? ""}
                      />
                    </div>
                  )}
                </>
              )}

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="isActive"
                  value="true"
                  defaultChecked={product?.isActive ?? true}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Active (visible in catalog)
              </label>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <SubmitButton pending={pending} className="flex-1">
              {product ? "Save changes" : "Create product"}
            </SubmitButton>
            <Link
              href={product ? `/products/${product.id}` : "/products"}
              className={buttonClasses("outline", "md")}
            >
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </form>
  );
}

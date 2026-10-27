"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ImageIcon, Upload, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  createMenuItem,
  saveMenuItemImage,
  updateMenuItem,
  uploadMenuItemImage,
} from "@/app/dashboard/menu/actions";
import { formatRupiah } from "@/lib/format-rupiah";
import { compressImage } from "@/lib/image-compress";
import { cn } from "@/lib/utils";
import type { MenuItem } from "@/types/database";

const schema = z.object({
  categoryId: z.string(),
  name: z.string().min(1, "Nama item tidak boleh kosong.").max(100),
  description: z
    .string()
    .max(300, "Maksimal 300 karakter")
    .optional()
    .or(z.literal("")),
  price: z.number().int().min(0, "Harga tidak boleh negatif."),
  isAvailable: z.boolean(),
  isFeatured: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  businessId: string;
  categoryId: string;
  categoryName: string;
  item?: MenuItem;
  onClose: () => void;
  onSaved: () => void;
};

const inputClass =
  "w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition";

function storageUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/menu-images/${path}`;
}

export function MenuItemForm({
  businessId,
  categoryId,
  categoryName,
  item,
  onClose,
  onSaved,
}: Props) {
  const isEdit = !!item;
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState(
    item?.image_path ? storageUrl(item.image_path) : null,
  );
  const [pendingImagePath, setPendingImagePath] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [priceDisplay, setPriceDisplay] = useState(
    item ? formatRupiah(item.price) : "",
  );
  const fileRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      categoryId,
      name: item?.name ?? "",
      description: item?.description ?? "",
      price: item?.price ?? 0,
      isAvailable: item?.is_available ?? true,
      isFeatured: item?.is_featured ?? false,
    },
  });

  useEffect(() => {
    const sub = form.watch((v) => {
      const p = Number(v.price);
      if (!Number.isNaN(p)) setPriceDisplay(formatRupiah(p));
    });
    return () => sub.unsubscribe();
  }, [form]);

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const compressed = await compressImage(file);
      const fd = new FormData();
      fd.append(
        "file",
        new File([compressed], "photo.webp", { type: "image/webp" }),
      );
      fd.append("businessId", businessId);
      const result = await uploadMenuItemImage(fd);
      if (result.error) throw new Error(result.error);
      if (result.publicUrl && result.path) {
        setImageUrl(result.publicUrl);
        setPendingImagePath(result.path);
      }
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Gagal mengunggah foto.",
      );
    } finally {
      setUploadingImage(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function onSubmit(values: FormValues) {
    setServerError(null);
    startTransition(async () => {
      let result: { success?: boolean; error?: string; id?: string };

      if (isEdit) {
        result = await updateMenuItem(item.id, values);
        if (result.success && pendingImagePath) {
          await saveMenuItemImage(item.id, pendingImagePath);
        }
      } else {
        result = await createMenuItem(values);
        if (result.success && result.id && pendingImagePath) {
          await saveMenuItemImage(result.id, pendingImagePath);
        }
      }

      if (result.error) {
        setServerError(result.error);
      } else {
        onSaved();
      }
    });
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: modal backdrop dismiss
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape is handled in onKeyDown of inner content
    <div
      className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      onClick={onClose}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: stop click propagation on modal panel */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard handled by buttons and form fields inside */}
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 sticky top-0 bg-white rounded-t-2xl sm:rounded-t-2xl z-10">
          <div>
            <p className="text-base font-semibold text-zinc-900">
              {isEdit ? "Edit Item" : "Tambah Item"}
            </p>
            <p className="text-xs text-zinc-400">{categoryName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 transition-colors"
          >
            <X className="w-4 h-4 text-zinc-500" />
          </button>
        </div>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="p-5 flex flex-col gap-4"
        >
          {serverError && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
              {serverError}
            </div>
          )}

          {/* Image */}
          <div>
            <p className="text-sm font-medium text-zinc-700 mb-2">
              Foto (opsional)
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="relative w-16 h-16 rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50 flex items-center justify-center overflow-hidden shrink-0 hover:border-orange-300 transition-colors"
              >
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt="Item"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <ImageIcon className="w-6 h-6 text-zinc-300" />
                )}
                {uploadingImage && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                    <span className="text-[10px] text-zinc-500">Upload...</span>
                  </div>
                )}
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploadingImage}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                {uploadingImage
                  ? "Mengupload..."
                  : imageUrl
                    ? "Ganti foto"
                    : "Pilih foto"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>
          </div>

          {/* Name */}
          <div>
            <label
              htmlFor="item-name"
              className="block text-sm font-medium text-zinc-700 mb-1.5"
            >
              Nama item <span className="text-red-400">*</span>
            </label>
            <input
              id="item-name"
              {...form.register("name")}
              placeholder="cth. Kopi Susu, Nasi Goreng"
              className={cn(
                inputClass,
                form.formState.errors.name &&
                  "border-red-300 focus:border-red-400 focus:ring-red-100",
              )}
            />
            {form.formState.errors.name && (
              <p className="mt-1 text-xs text-red-500">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="item-desc"
              className="block text-sm font-medium text-zinc-700 mb-1.5"
            >
              Deskripsi
            </label>
            <textarea
              id="item-desc"
              {...form.register("description")}
              rows={2}
              placeholder="cth. Kopi susu dengan gula aren"
              className={cn(inputClass, "resize-none")}
            />
          </div>

          {/* Price */}
          <div>
            <label
              htmlFor="item-price"
              className="block text-sm font-medium text-zinc-700 mb-1.5"
            >
              Harga <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                Rp
              </span>
              <input
                id="item-price"
                {...form.register("price", { valueAsNumber: true })}
                type="number"
                min={0}
                step={500}
                placeholder="25000"
                className={cn(inputClass, "pl-10")}
              />
            </div>
            {priceDisplay && form.watch("price") > 0 && (
              <p className="mt-1 text-xs text-zinc-400">{priceDisplay}</p>
            )}
            {form.formState.errors.price && (
              <p className="mt-1 text-xs text-red-500">
                {form.formState.errors.price.message}
              </p>
            )}
          </div>

          {/* Toggles */}
          <div className="flex flex-col gap-3 py-1">
            <label
              htmlFor="toggle-available"
              className="flex items-center justify-between cursor-pointer"
            >
              <div>
                <p className="text-sm font-medium text-zinc-800">Tersedia</p>
                <p className="text-xs text-zinc-400">
                  Item bisa dipesan pelanggan
                </p>
              </div>
              <div
                className={cn(
                  "relative w-10 h-6 rounded-full transition-colors pointer-events-none",
                  form.watch("isAvailable") ? "bg-orange-500" : "bg-zinc-200",
                )}
              >
                <div
                  className={cn(
                    "absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform",
                    form.watch("isAvailable")
                      ? "translate-x-5"
                      : "translate-x-1",
                  )}
                />
              </div>
              <input
                id="toggle-available"
                type="checkbox"
                className="sr-only"
                {...form.register("isAvailable")}
              />
            </label>

            <label
              htmlFor="toggle-featured"
              className="flex items-center justify-between cursor-pointer"
            >
              <div>
                <p className="text-sm font-medium text-zinc-800">Andalan</p>
                <p className="text-xs text-zinc-400">
                  Ditampilkan sebagai menu favorit
                </p>
              </div>
              <div
                className={cn(
                  "relative w-10 h-6 rounded-full transition-colors pointer-events-none",
                  form.watch("isFeatured") ? "bg-orange-500" : "bg-zinc-200",
                )}
              >
                <div
                  className={cn(
                    "absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform",
                    form.watch("isFeatured")
                      ? "translate-x-5"
                      : "translate-x-1",
                  )}
                />
              </div>
              <input
                id="toggle-featured"
                type="checkbox"
                className="sr-only"
                {...form.register("isFeatured")}
              />
            </label>
          </div>

          <input type="hidden" {...form.register("categoryId")} />

          <button
            type="submit"
            disabled={isPending || uploadingImage}
            className="w-full rounded-full bg-orange-500 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 active:scale-[0.98] disabled:opacity-60 transition-all"
          >
            {isPending
              ? "Menyimpan..."
              : isEdit
                ? "Simpan Perubahan"
                : "Tambah Item"}
          </button>
        </form>
      </div>
    </div>
  );
}

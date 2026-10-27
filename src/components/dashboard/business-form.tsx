"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { upsertBusiness } from "@/app/dashboard/profile/actions";
import { generateSlug } from "@/lib/slug";
import { cn } from "@/lib/utils";
import type { Business } from "@/types/database";

const schema = z.object({
  name: z
    .string()
    .min(2, "Nama usaha minimal 2 karakter")
    .max(100, "Maksimal 100 karakter"),
  business_type: z.enum([
    "cafe",
    "restaurant",
    "food_stall",
    "bakery",
    "other",
  ]),
  description: z
    .string()
    .max(500, "Maksimal 500 karakter")
    .optional()
    .or(z.literal("")),
  address: z
    .string()
    .max(300, "Maksimal 300 karakter")
    .optional()
    .or(z.literal("")),
  whatsapp_number: z
    .string()
    .max(20, "Nomor terlalu panjang")
    .optional()
    .or(z.literal("")),
  slug: z
    .string()
    .min(3, "Minimal 3 karakter")
    .max(60, "Maksimal 60 karakter")
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      "Hanya huruf kecil, angka, dan tanda hubung",
    ),
});

type FormValues = z.infer<typeof schema>;

const businessTypeOptions = [
  { value: "cafe", label: "Kafe" },
  { value: "restaurant", label: "Restoran" },
  { value: "food_stall", label: "Warung Makan" },
  { value: "bakery", label: "Bakeri / Toko Kue" },
  { value: "other", label: "Lainnya" },
] as const;

type Props = {
  defaultValues?: Partial<Business>;
  slugLocked: boolean;
  isNew: boolean;
};

const inputClass =
  "w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition";
const labelClass = "block text-sm font-medium text-zinc-700 mb-1.5";
const errorClass = "mt-1 text-xs text-red-500";

export function BusinessForm({ defaultValues, slugLocked, isNew }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [savedOk, setSavedOk] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [autoSlug, setAutoSlug] = useState(isNew);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      business_type: defaultValues?.business_type ?? "other",
      description: defaultValues?.description ?? "",
      address: defaultValues?.address ?? "",
      whatsapp_number: defaultValues?.whatsapp_number ?? "",
      slug: defaultValues?.slug ?? "",
    },
  });

  const nameValue = form.watch("name");

  useEffect(() => {
    if (!autoSlug) return;
    form.setValue("slug", generateSlug(nameValue), {
      shouldValidate: !!nameValue,
    });
  }, [nameValue, autoSlug, form]);

  function onSubmit(values: FormValues) {
    setSavedOk(false);
    setServerError(null);
    startTransition(async () => {
      const result = await upsertBusiness(values);
      if (result.success) {
        setSavedOk(true);
        router.refresh();
      } else if (result.fieldErrors) {
        for (const [field, msg] of Object.entries(result.fieldErrors)) {
          if (msg) form.setError(field as keyof FormValues, { message: msg });
        }
      } else if (result.error) {
        setServerError(result.error);
      }
    });
  }

  const slugField = form.register("slug");

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
    >
      {serverError && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
          {serverError}
        </div>
      )}
      {savedOk && (
        <div className="rounded-lg bg-green-50 border border-green-100 px-4 py-3 text-sm text-green-700">
          Profil usaha berhasil disimpan!
        </div>
      )}

      <div>
        <label htmlFor="name" className={labelClass}>
          Nama usaha <span className="text-red-400">*</span>
        </label>
        <input
          id="name"
          {...form.register("name")}
          placeholder="cth. Kopi Senja, Warung Mbok Sri"
          className={cn(
            inputClass,
            form.formState.errors.name &&
              "border-red-300 focus:border-red-400 focus:ring-red-100",
          )}
        />
        {form.formState.errors.name && (
          <p className={errorClass}>{form.formState.errors.name.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="business_type" className={labelClass}>
          Jenis usaha <span className="text-red-400">*</span>
        </label>
        <select
          id="business_type"
          {...form.register("business_type")}
          className={cn(inputClass, "cursor-pointer")}
        >
          {businessTypeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="description" className={labelClass}>
          Deskripsi singkat
        </label>
        <textarea
          id="description"
          {...form.register("description")}
          rows={3}
          placeholder="cth. Kopi spesialti dan camilan homemade di tengah kota"
          className={cn(inputClass, "resize-none")}
        />
        {form.formState.errors.description && (
          <p className={errorClass}>
            {form.formState.errors.description.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="address" className={labelClass}>
          Alamat
        </label>
        <textarea
          id="address"
          {...form.register("address")}
          rows={2}
          placeholder="cth. Jl. Sudirman No. 10, Jakarta Pusat"
          className={cn(inputClass, "resize-none")}
        />
        {form.formState.errors.address && (
          <p className={errorClass}>{form.formState.errors.address.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="whatsapp_number" className={labelClass}>
          Nomor WhatsApp
        </label>
        <input
          id="whatsapp_number"
          {...form.register("whatsapp_number")}
          type="tel"
          placeholder="cth. 08123456789"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-zinc-400">
          Format bebas, akan otomatis diubah ke format 62xxx
        </p>
        {form.formState.errors.whatsapp_number && (
          <p className={errorClass}>
            {form.formState.errors.whatsapp_number.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="slug" className={labelClass}>
          Link menu <span className="text-red-400">*</span>
          {slugLocked && (
            <span className="ml-2 text-xs font-normal text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
              Tidak bisa diubah lagi
            </span>
          )}
        </label>
        <div className="flex items-center">
          <span className="shrink-0 rounded-l-lg border border-r-0 border-zinc-200 bg-zinc-100 px-3 py-2.5 text-xs text-zinc-500 whitespace-nowrap">
            menuiro.com/m/
          </span>
          <input
            id="slug"
            {...slugField}
            onChange={(e) => {
              setAutoSlug(false);
              slugField.onChange(e);
            }}
            readOnly={slugLocked}
            placeholder="nama-usaha-kamu"
            className={cn(
              inputClass,
              "rounded-l-none",
              slugLocked && "bg-zinc-100 text-zinc-500 cursor-not-allowed",
              form.formState.errors.slug &&
                "border-red-300 focus:border-red-400 focus:ring-red-100",
            )}
          />
        </div>
        {form.formState.errors.slug && (
          <p className={errorClass}>{form.formState.errors.slug.message}</p>
        )}
        {!slugLocked && (
          <p className="mt-1 text-xs text-zinc-400">
            {isNew
              ? "Bisa diubah sekali setelah disimpan."
              : "Kamu masih bisa mengubah link ini sekali lagi."}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="mt-1 w-full rounded-full bg-orange-500 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 active:scale-[0.98] disabled:opacity-60 transition-all"
      >
        {isPending ? "Menyimpan..." : "Simpan"}
      </button>
    </form>
  );
}

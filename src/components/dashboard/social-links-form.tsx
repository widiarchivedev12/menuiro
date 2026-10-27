"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { saveSocialLinks } from "@/app/dashboard/profile/actions";
import type { SocialLink } from "@/types/database";

const platforms = [
  {
    value: "instagram" as const,
    label: "Instagram",
    placeholder: "https://instagram.com/namakamu",
  },
  {
    value: "tiktok" as const,
    label: "TikTok",
    placeholder: "https://tiktok.com/@namakamu",
  },
  {
    value: "facebook" as const,
    label: "Facebook",
    placeholder: "https://facebook.com/namakamu",
  },
  {
    value: "website" as const,
    label: "Website",
    placeholder: "https://website-kamu.com",
  },
  {
    value: "gofood" as const,
    label: "GoFood",
    placeholder: "https://gofood.co.id/...",
  },
  {
    value: "grabfood" as const,
    label: "GrabFood",
    placeholder: "https://grab.com/...",
  },
  {
    value: "shopeefood" as const,
    label: "ShopeeFood",
    placeholder: "https://shopee.co.id/...",
  },
];

const schema = z.object({
  instagram: z.string().optional().or(z.literal("")),
  tiktok: z.string().optional().or(z.literal("")),
  facebook: z.string().optional().or(z.literal("")),
  website: z.string().optional().or(z.literal("")),
  gofood: z.string().optional().or(z.literal("")),
  grabfood: z.string().optional().or(z.literal("")),
  shopeefood: z.string().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  businessId: string;
  currentLinks: SocialLink[];
};

const inputClass =
  "w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition";

export function SocialLinksForm({ businessId, currentLinks }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [savedOk, setSavedOk] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      instagram:
        currentLinks.find((l) => l.platform === "instagram")?.url ?? "",
      tiktok: currentLinks.find((l) => l.platform === "tiktok")?.url ?? "",
      facebook: currentLinks.find((l) => l.platform === "facebook")?.url ?? "",
      website: currentLinks.find((l) => l.platform === "website")?.url ?? "",
      gofood: currentLinks.find((l) => l.platform === "gofood")?.url ?? "",
      grabfood: currentLinks.find((l) => l.platform === "grabfood")?.url ?? "",
      shopeefood:
        currentLinks.find((l) => l.platform === "shopeefood")?.url ?? "",
    },
  });

  function onSubmit(values: FormValues) {
    setSavedOk(false);
    setServerError(null);
    const links = platforms.map((p) => ({
      platform: p.value,
      url: values[p.value] ?? "",
    }));
    startTransition(async () => {
      const result = await saveSocialLinks({ businessId, links });
      if (result.success) {
        setSavedOk(true);
        router.refresh();
      } else {
        setServerError(result.error ?? "Terjadi kesalahan.");
      }
    });
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-3"
    >
      {serverError && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
          {serverError}
        </div>
      )}
      {savedOk && (
        <div className="rounded-lg bg-green-50 border border-green-100 px-4 py-3 text-sm text-green-700">
          Media sosial berhasil disimpan!
        </div>
      )}

      {platforms.map((p) => (
        <div key={p.value} className="flex items-center gap-3">
          <span className="w-24 shrink-0 text-sm font-medium text-zinc-700">
            {p.label}
          </span>
          <input
            {...form.register(p.value)}
            type="text"
            inputMode="url"
            placeholder={p.placeholder}
            className={inputClass}
          />
        </div>
      ))}

      <button
        type="submit"
        disabled={isPending}
        className="mt-2 w-full rounded-full bg-orange-500 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 active:scale-[0.98] disabled:opacity-60 transition-all"
      >
        {isPending ? "Menyimpan..." : "Simpan Media Sosial"}
      </button>
    </form>
  );
}

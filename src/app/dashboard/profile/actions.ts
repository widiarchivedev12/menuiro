"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { SocialPlatform } from "@/types/database";

export type ActionResult = {
  success?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
};

function normalizeWhatsApp(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return `62${digits}`;
}

const businessSchema = z.object({
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

export async function upsertBusiness(formData: unknown): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Kamu harus masuk terlebih dahulu." };

  const parsed = businessSchema.safeParse(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as string | undefined;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const { name, business_type, description, address, whatsapp_number, slug } =
    parsed.data;
  const normalizedWa = whatsapp_number
    ? normalizeWhatsApp(whatsapp_number)
    : null;

  const { data: existing } = await supabase
    .from("businesses")
    .select("id, slug, slug_changed")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (existing) {
    if (slug !== existing.slug && existing.slug_changed) {
      return {
        fieldErrors: {
          slug: "Link tidak bisa diubah lagi (sudah pernah diubah).",
        },
      };
    }

    const { error } = await supabase
      .from("businesses")
      .update({
        name,
        business_type,
        description: description || null,
        address: address || null,
        whatsapp_number: normalizedWa || null,
        ...(slug !== existing.slug ? { slug } : {}),
      })
      .eq("id", existing.id);

    if (error) {
      if (error.code === "23505")
        return {
          fieldErrors: { slug: "Link ini sudah dipakai, coba yang lain." },
        };
      if (error.message?.includes("slug_already_changed"))
        return {
          fieldErrors: { slug: "Link tidak bisa diubah lagi." },
        };
      return { error: "Gagal menyimpan profil usaha." };
    }
  } else {
    const { error } = await supabase.from("businesses").insert({
      owner_id: user.id,
      name,
      business_type,
      description: description || null,
      address: address || null,
      whatsapp_number: normalizedWa || null,
      slug,
    });

    if (error) {
      if (error.code === "23505")
        return {
          fieldErrors: { slug: "Link ini sudah dipakai, coba yang lain." },
        };
      return { error: "Gagal membuat profil usaha." };
    }
  }

  revalidatePath("/dashboard/profile");
  revalidatePath(`/m/${slug}`);
  return { success: true };
}

const socialLinksSchema = z.object({
  businessId: z.string().uuid(),
  links: z.array(
    z.object({
      platform: z.enum([
        "instagram",
        "tiktok",
        "facebook",
        "website",
        "grabfood",
        "gofood",
        "shopeefood",
      ]),
      url: z.string(),
    }),
  ),
});

export async function saveSocialLinks(
  formData: unknown,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Kamu harus masuk terlebih dahulu." };

  const parsed = socialLinksSchema.safeParse(formData);
  if (!parsed.success) return { error: "Data tidak valid." };

  const { businessId, links } = parsed.data;

  const { data: business } = await supabase
    .from("businesses")
    .select("id, slug")
    .eq("id", businessId)
    .eq("owner_id", user.id)
    .single();
  if (!business) return { error: "Usaha tidak ditemukan." };

  const toUpsert = links.filter((l) => l.url.trim() !== "");
  const toDelete = links
    .filter((l) => l.url.trim() === "")
    .map((l) => l.platform);

  if (toUpsert.length > 0) {
    const { error } = await supabase.from("social_links").upsert(
      toUpsert.map((l) => ({
        business_id: businessId,
        platform: l.platform as SocialPlatform,
        url: l.url.trim(),
      })),
      { onConflict: "business_id,platform" },
    );
    if (error) return { error: "Gagal menyimpan media sosial." };
  }

  if (toDelete.length > 0) {
    const { error } = await supabase
      .from("social_links")
      .delete()
      .eq("business_id", businessId)
      .in("platform", toDelete);
    if (error) return { error: "Gagal memperbarui media sosial." };
  }

  revalidatePath("/dashboard/profile");
  revalidatePath(`/m/${business.slug}`);
  return { success: true };
}

export async function uploadBusinessImage(
  formData: FormData,
): Promise<ActionResult & { publicUrl?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Kamu harus masuk terlebih dahulu." };

  const file = formData.get("file") as File | null;
  const type = formData.get("type") as "logo" | "cover" | null;
  const businessId = formData.get("businessId") as string | null;

  if (!file || !type || !businessId) return { error: "Data tidak lengkap." };

  const { data: business } = await supabase
    .from("businesses")
    .select("slug")
    .eq("id", businessId)
    .eq("owner_id", user.id)
    .single();
  if (!business) return { error: "Usaha tidak ditemukan." };

  const path = `${businessId}/${crypto.randomUUID()}.webp`;
  const buffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("menu-images")
    .upload(path, buffer, { contentType: "image/webp" });
  if (uploadError) return { error: uploadError.message };

  const updateData =
    type === "logo" ? { logo_path: path } : { cover_path: path };
  const { error: dbError } = await supabase
    .from("businesses")
    .update(updateData)
    .eq("id", businessId);
  if (dbError) {
    await supabase.storage.from("menu-images").remove([path]);
    return { error: "Gagal menyimpan foto." };
  }

  revalidatePath("/dashboard/profile");
  revalidatePath(`/m/${business.slug}`);
  return {
    success: true,
    publicUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/menu-images/${path}`,
  };
}

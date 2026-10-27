"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = {
  success?: boolean;
  error?: string;
  id?: string;
};

// ─── helpers ────────────────────────────────────────────────────────────────

async function getOwnedBusiness(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from("businesses")
    .select("id, slug")
    .eq("owner_id", userId)
    .maybeSingle();
  return data;
}

// ─── categories ──────────────────────────────────────────────────────────────

export async function createCategory(name: string): Promise<ActionResult> {
  if (!name.trim()) return { error: "Nama kategori tidak boleh kosong." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tidak terautentikasi." };

  const business = await getOwnedBusiness(supabase, user.id);
  if (!business) return { error: "Profil usaha belum dibuat." };

  const { data: last } = await supabase
    .from("categories")
    .select("sort_order")
    .eq("business_id", business.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("categories").insert({
    business_id: business.id,
    name: name.trim(),
    sort_order: (last?.sort_order ?? -1) + 1,
  });
  if (error) return { error: "Gagal membuat kategori." };

  revalidatePath("/dashboard/menu");
  revalidatePath(`/m/${business.slug}`);
  return { success: true };
}

export async function updateCategory(id: string, name: string): Promise<ActionResult> {
  if (!name.trim()) return { error: "Nama kategori tidak boleh kosong." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tidak terautentikasi." };

  const business = await getOwnedBusiness(supabase, user.id);
  if (!business) return { error: "Usaha tidak ditemukan." };

  const { error } = await supabase
    .from("categories")
    .update({ name: name.trim() })
    .eq("id", id)
    .eq("business_id", business.id);
  if (error) return { error: "Gagal memperbarui kategori." };

  revalidatePath("/dashboard/menu");
  revalidatePath(`/m/${business.slug}`);
  return { success: true };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tidak terautentikasi." };

  const business = await getOwnedBusiness(supabase, user.id);
  if (!business) return { error: "Usaha tidak ditemukan." };

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("business_id", business.id);
  if (error) return { error: "Gagal menghapus kategori." };

  revalidatePath("/dashboard/menu");
  revalidatePath(`/m/${business.slug}`);
  return { success: true };
}

export async function reorderCategories(orderedIds: string[]): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tidak terautentikasi." };

  const business = await getOwnedBusiness(supabase, user.id);
  if (!business) return { error: "Usaha tidak ditemukan." };

  const updates = orderedIds.map((id, index) =>
    supabase
      .from("categories")
      .update({ sort_order: index })
      .eq("id", id)
      .eq("business_id", business.id),
  );
  await Promise.all(updates);

  revalidatePath("/dashboard/menu");
  revalidatePath(`/m/${business.slug}`);
  return { success: true };
}

// ─── menu items ──────────────────────────────────────────────────────────────

const menuItemSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(1, "Nama item tidak boleh kosong.").max(100),
  description: z.string().max(300).optional().or(z.literal("")),
  price: z.coerce.number().int().min(0, "Harga tidak boleh negatif."),
  isAvailable: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
});

export async function createMenuItem(data: unknown): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tidak terautentikasi." };

  const parsed = menuItemSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const business = await getOwnedBusiness(supabase, user.id);
  if (!business) return { error: "Usaha tidak ditemukan." };

  const { data: last } = await supabase
    .from("menu_items")
    .select("sort_order")
    .eq("category_id", parsed.data.categoryId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: newItem, error } = await supabase
    .from("menu_items")
    .insert({
      business_id: business.id,
      category_id: parsed.data.categoryId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      price: parsed.data.price,
      is_available: parsed.data.isAvailable,
      is_featured: parsed.data.isFeatured,
      sort_order: (last?.sort_order ?? -1) + 1,
    })
    .select("id")
    .single();
  if (error) return { error: "Gagal membuat item menu." };

  revalidatePath("/dashboard/menu");
  revalidatePath(`/m/${business.slug}`);
  return { success: true, id: newItem.id };
}

export async function updateMenuItem(id: string, data: unknown): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tidak terautentikasi." };

  const parsed = menuItemSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const business = await getOwnedBusiness(supabase, user.id);
  if (!business) return { error: "Usaha tidak ditemukan." };

  const { error } = await supabase
    .from("menu_items")
    .update({
      name: parsed.data.name,
      description: parsed.data.description || null,
      price: parsed.data.price,
      is_available: parsed.data.isAvailable,
      is_featured: parsed.data.isFeatured,
    })
    .eq("id", id)
    .eq("business_id", business.id);
  if (error) return { error: "Gagal memperbarui item menu." };

  revalidatePath("/dashboard/menu");
  revalidatePath(`/m/${business.slug}`);
  return { success: true };
}

export async function deleteMenuItem(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tidak terautentikasi." };

  const business = await getOwnedBusiness(supabase, user.id);
  if (!business) return { error: "Usaha tidak ditemukan." };

  const { error } = await supabase
    .from("menu_items")
    .delete()
    .eq("id", id)
    .eq("business_id", business.id);
  if (error) return { error: "Gagal menghapus item." };

  revalidatePath("/dashboard/menu");
  revalidatePath(`/m/${business.slug}`);
  return { success: true };
}

export async function reorderMenuItems(
  items: { id: string; sort_order: number }[],
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tidak terautentikasi." };

  const business = await getOwnedBusiness(supabase, user.id);
  if (!business) return { error: "Usaha tidak ditemukan." };

  await Promise.all(
    items.map((item) =>
      supabase
        .from("menu_items")
        .update({ sort_order: item.sort_order })
        .eq("id", item.id)
        .eq("business_id", business.id),
    ),
  );

  revalidatePath("/dashboard/menu");
  revalidatePath(`/m/${business.slug}`);
  return { success: true };
}

export async function toggleMenuItemAvailable(
  id: string,
  isAvailable: boolean,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tidak terautentikasi." };

  const business = await getOwnedBusiness(supabase, user.id);
  if (!business) return { error: "Usaha tidak ditemukan." };

  const { error } = await supabase
    .from("menu_items")
    .update({ is_available: isAvailable })
    .eq("id", id)
    .eq("business_id", business.id);
  if (error) return { error: "Gagal mengubah status item." };

  revalidatePath("/dashboard/menu");
  revalidatePath(`/m/${business.slug}`);
  return { success: true };
}

export async function uploadMenuItemImage(
  formData: FormData,
): Promise<ActionResult & { publicUrl?: string; path?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tidak terautentikasi." };

  const file = formData.get("file") as File | null;
  const businessId = formData.get("businessId") as string | null;
  if (!file || !businessId) return { error: "Data tidak lengkap." };

  const business = await getOwnedBusiness(supabase, user.id);
  if (!business || business.id !== businessId) return { error: "Usaha tidak ditemukan." };

  const path = `${businessId}/${crypto.randomUUID()}.webp`;
  const buffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("menu-images")
    .upload(path, buffer, { contentType: "image/webp" });
  if (uploadError) return { error: uploadError.message };

  return {
    success: true,
    path,
    publicUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/menu-images/${path}`,
  };
}

export async function saveMenuItemImage(
  itemId: string,
  imagePath: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tidak terautentikasi." };

  const business = await getOwnedBusiness(supabase, user.id);
  if (!business) return { error: "Usaha tidak ditemukan." };

  const { error } = await supabase
    .from("menu_items")
    .update({ image_path: imagePath })
    .eq("id", itemId)
    .eq("business_id", business.id);
  if (error) return { error: "Gagal menyimpan foto item." };

  revalidatePath("/dashboard/menu");
  revalidatePath(`/m/${business.slug}`);
  return { success: true };
}

import { redirect } from "next/navigation";
import Link from "next/link";
import { Store } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { MenuList } from "@/components/dashboard/menu-list";
import type { Category, MenuItem } from "@/types/database";

export type CategoryWithItems = Category & { menu_items: MenuItem[] };

export default async function MenuPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!business) {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8 pb-24 lg:pb-8 max-w-2xl">
        <div className="rounded-xl bg-white border border-zinc-100 shadow-sm p-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-orange-50 mb-3">
            <Store className="w-6 h-6 text-orange-400" />
          </div>
          <p className="text-sm font-medium text-zinc-900 mb-1">
            Profil usaha belum dibuat
          </p>
          <p className="text-sm text-zinc-500 mb-4">
            Lengkapi profil usaha terlebih dahulu sebelum menambahkan menu.
          </p>
          <Link
            href="/dashboard/profile"
            className="inline-flex items-center justify-center rounded-full bg-orange-500 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
          >
            Buat profil usaha
          </Link>
        </div>
      </div>
    );
  }

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("business_id", business.id)
    .order("sort_order", { ascending: true });

  const { data: menuItems } = await supabase
    .from("menu_items")
    .select("*")
    .eq("business_id", business.id)
    .order("sort_order", { ascending: true });

  const categoriesWithItems: CategoryWithItems[] = (categories ?? []).map(
    (cat) => ({
      ...cat,
      menu_items: (menuItems ?? []).filter(
        (item) => item.category_id === cat.id,
      ),
    }),
  );

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 pb-24 lg:pb-8 max-w-2xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-zinc-900">Menu</h2>
        <p className="text-sm text-zinc-500 mt-0.5">
          Kelola kategori dan item menu kamu
        </p>
      </div>

      <MenuList
        businessId={business.id}
        initialCategories={categoriesWithItems}
      />
    </div>
  );
}

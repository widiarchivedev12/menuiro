import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Store, UtensilsCrossed, Palette, ExternalLink } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const planLabel: Record<string, { label: string; color: string }> = {
  free_testimonial: {
    label: "Gratis",
    color: "bg-green-50 text-green-700 ring-1 ring-green-200",
  },
  waitlist: {
    label: "Dalam Antrean",
    color: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  },
  paid: {
    label: "Premium",
    color: "bg-purple-50 text-purple-700 ring-1 ring-purple-200",
  },
};

const quickNav: { href: string; title: string; desc: string; icon: LucideIcon }[] = [
  {
    href: "/dashboard/profil",
    title: "Profil Usaha",
    desc: "Nama, lokasi, kontak",
    icon: Store,
  },
  {
    href: "/dashboard/menu",
    title: "Menu",
    desc: "Tambah kategori & item",
    icon: UtensilsCrossed,
  },
  {
    href: "/dashboard/template",
    title: "Tampilan",
    desc: "Pilih & sesuaikan template",
    icon: Palette,
  },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  const plan = profile?.plan ?? "waitlist";
  const planInfo = planLabel[plan] ?? planLabel.waitlist;
  const firstName = profile?.full_name?.split(" ")[0] ?? "kamu";
  const isWaitlist = plan === "waitlist";

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 pb-24 lg:pb-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900">
            Halo, {firstName}!
          </h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            Selamat datang di dashboard Menuiro
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${planInfo.color}`}
        >
          {planInfo.label}
        </span>
      </div>

      {/* Waitlist banner */}
      {isWaitlist && (
        <div className="mb-6 rounded-xl bg-amber-50 border border-amber-100 p-4">
          <p className="text-sm font-medium text-amber-800">
            Kamu sedang dalam daftar tunggu
          </p>
          <p className="text-sm text-amber-700 mt-0.5">
            Saat ini kami sedang penuh. Kamu akan mendapat akses penuh segera
            setelah ada slot tersedia.
          </p>
        </div>
      )}

      {/* No business yet */}
      {!business && !isWaitlist && (
        <div className="mb-6 rounded-xl bg-white border border-zinc-100 shadow-sm p-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-orange-50 mb-3">
            <Store className="w-6 h-6 text-orange-400" />
          </div>
          <p className="text-sm font-medium text-zinc-900 mb-1">
            Belum ada profil usaha
          </p>
          <p className="text-sm text-zinc-500 mb-4">
            Lengkapi profil usaha kamu untuk memulai membuat menu digital.
          </p>
          <Link
            href="/dashboard/profil"
            className="inline-flex items-center justify-center rounded-full bg-orange-500 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
          >
            Buat profil usaha
          </Link>
        </div>
      )}

      {/* Business status */}
      {business && (
        <div className="mb-6 rounded-xl bg-white border border-zinc-100 shadow-sm p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-500 mb-0.5">
                Status menu
              </p>
              <p className="text-base font-semibold text-zinc-900">
                {business.name}
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                business.is_published
                  ? "bg-green-50 text-green-700 ring-1 ring-green-200"
                  : "bg-zinc-50 text-zinc-600 ring-1 ring-zinc-200"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${business.is_published ? "bg-green-500" : "bg-zinc-400"}`}
              />
              {business.is_published ? "Sudah terbit" : "Belum diterbitkan"}
            </span>
          </div>

          {business.is_published && (
            <div className="mt-3 flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-zinc-50 border border-zinc-100 px-3 py-2 text-xs text-zinc-600 truncate">
                menuiro.com/m/{business.slug}
              </code>
              <Link
                href={`/m/${business.slug}`}
                target="_blank"
                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Buka
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Quick nav cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {quickNav.map(({ href, title, desc, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="rounded-xl bg-white border border-zinc-100 shadow-sm p-4 hover:border-orange-200 hover:shadow-md transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center mb-3 group-hover:bg-orange-100 transition-colors">
              <Icon className="w-5 h-5 text-orange-500" />
            </div>
            <p className="text-sm font-semibold text-zinc-900 group-hover:text-orange-600 transition-colors">
              {title}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

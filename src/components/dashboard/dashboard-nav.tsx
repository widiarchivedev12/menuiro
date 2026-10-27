"use client";

import {
  LayoutDashboard,
  LogOut,
  Palette,
  Store,
  UtensilsCrossed,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/(auth)/actions";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Ringkasan", icon: LayoutDashboard },
  { href: "/dashboard/profile", label: "Profil Usaha", icon: Store },
  { href: "/dashboard/menu", label: "Menu", icon: UtensilsCrossed },
  { href: "/dashboard/template", label: "Tampilan", icon: Palette },
] as const;

type Props = {
  initials: string;
  fullName: string | null;
  email: string;
};

export function DashboardNav({ initials, fullName, email }: Props) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <>
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:fixed lg:inset-y-0 bg-white border-r border-zinc-100">
        <div className="flex h-16 items-center px-6 border-b border-zinc-100">
          <Link href="/dashboard" className="text-xl font-bold text-orange-500">
            Menuiro
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive(href)
                  ? "bg-orange-50 text-orange-600"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900",
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 shrink-0",
                  isActive(href) ? "text-orange-500" : "text-zinc-400",
                )}
              />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-zinc-100">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-xs font-semibold text-orange-600 shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-900 truncate">
                {fullName ?? email}
              </p>
              <p className="text-xs text-zinc-400 truncate">{email}</p>
            </div>
          </div>
          <form action={logout} className="mt-1">
            <button
              type="submit"
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 transition-colors"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              Keluar
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="lg:hidden sticky top-0 z-10 flex h-14 items-center justify-between bg-white border-b border-zinc-100 px-4">
        <Link href="/dashboard" className="text-lg font-bold text-orange-500">
          Menuiro
        </Link>
        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-xs font-semibold text-orange-600">
          {initials}
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-zinc-100 flex z-10">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors",
              isActive(href)
                ? "text-orange-500"
                : "text-zinc-400 hover:text-zinc-600",
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}

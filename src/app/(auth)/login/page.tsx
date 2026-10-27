import Link from "next/link";
import { login } from "../actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const errorMessage: Record<string, string> = {
    Invalid_login_credentials: "Email atau kata sandi salah.",
    auth_error: "Terjadi kesalahan autentikasi. Coba lagi.",
  };

  const displayError = error
    ? (errorMessage[error] ?? "Terjadi kesalahan. Silakan coba lagi.")
    : null;

  return (
    <div className="w-full max-w-sm">
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-8">
        <h2 className="text-xl font-semibold text-zinc-900 mb-1">
          Selamat datang kembali
        </h2>
        <p className="text-sm text-zinc-500 mb-6">
          Masuk ke akun Menuiro kamu
        </p>

        {displayError && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
            {displayError}
          </div>
        )}

        <form action={login} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-zinc-700 mb-1.5"
            >
              Alamat email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="nama@email.com"
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-zinc-700 mb-1.5"
            >
              Kata sandi
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition"
            />
          </div>

          <button
            type="submit"
            className="mt-1 w-full rounded-full bg-orange-500 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 active:scale-[0.98] transition-all"
          >
            Masuk
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-zinc-500">
          Belum punya akun?{" "}
          <Link
            href="/register"
            className="font-semibold text-orange-500 hover:text-orange-600"
          >
            Daftar gratis
          </Link>
        </p>
      </div>
    </div>
  );
}

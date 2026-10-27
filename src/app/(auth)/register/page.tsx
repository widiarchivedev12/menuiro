import Link from "next/link";
import { register } from "../actions";
import { Mail } from "lucide-react";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  const errorMessage: Record<string, string> = {
    User_already_registered: "Email sudah terdaftar.",
    Password_should_be_at_least_6_characters:
      "Kata sandi minimal 6 karakter.",
    auth_error: "Terjadi kesalahan autentikasi. Coba lagi.",
  };

  const displayError = error
    ? (errorMessage[error] ?? "Terjadi kesalahan. Silakan coba lagi.")
    : null;

  if (message === "check_email") {
    return (
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-orange-50 mb-4">
            <Mail className="w-6 h-6 text-orange-500" />
          </div>
          <h2 className="text-xl font-semibold text-zinc-900 mb-2">
            Cek email kamu!
          </h2>
          <p className="text-sm text-zinc-500 mb-6">
            Kami mengirimkan link konfirmasi ke email kamu. Klik link tersebut
            untuk mengaktifkan akun.
          </p>
          <Link
            href="/login"
            className="text-sm font-semibold text-orange-500 hover:text-orange-600"
          >
            Kembali ke halaman masuk
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-8">
        <h2 className="text-xl font-semibold text-zinc-900 mb-1">
          Buat akun baru
        </h2>
        <p className="text-sm text-zinc-500 mb-6">
          Mulai buat menu digital kamu secara gratis
        </p>

        {displayError && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
            {displayError}
          </div>
        )}

        <form action={register} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="full_name"
              className="block text-sm font-medium text-zinc-700 mb-1.5"
            >
              Nama lengkap
            </label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              autoComplete="name"
              required
              placeholder="Nama kamu"
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition"
            />
          </div>

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
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="Min. 8 karakter"
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition"
            />
          </div>

          <button
            type="submit"
            className="mt-1 w-full rounded-full bg-orange-500 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 active:scale-[0.98] transition-all"
          >
            Daftar gratis
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-zinc-500">
          Sudah punya akun?{" "}
          <Link
            href="/login"
            className="font-semibold text-orange-500 hover:text-orange-600"
          >
            Masuk
          </Link>
        </p>
      </div>
    </div>
  );
}

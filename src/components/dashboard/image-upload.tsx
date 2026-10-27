"use client";

import { ImageIcon, Upload } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { uploadBusinessImage } from "@/app/dashboard/profile/actions";
import { compressImage } from "@/lib/image-compress";

type Props = {
  businessId: string;
  currentLogoPath: string | null;
  currentCoverPath: string | null;
};

type UploadType = "logo" | "cover";

function storageUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/menu-images/${path}`;
}

export function ImageUpload({
  businessId,
  currentLogoPath,
  currentCoverPath,
}: Props) {
  const [logoUrl, setLogoUrl] = useState(
    currentLogoPath ? storageUrl(currentLogoPath) : null,
  );
  const [coverUrl, setCoverUrl] = useState(
    currentCoverPath ? storageUrl(currentCoverPath) : null,
  );
  const [uploading, setUploading] = useState<UploadType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
    type: UploadType,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("File harus berupa gambar.");
      return;
    }

    setError(null);
    setUploading(type);

    try {
      const compressed = await compressImage(file);

      const formData = new FormData();
      formData.append(
        "file",
        new File([compressed], "photo.webp", { type: "image/webp" }),
      );
      formData.append("type", type);
      formData.append("businessId", businessId);

      const result = await uploadBusinessImage(formData);
      if (result.error) throw new Error(result.error);

      if (result.publicUrl) {
        if (type === "logo") setLogoUrl(result.publicUrl);
        else setCoverUrl(result.publicUrl);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengunggah foto.");
    } finally {
      setUploading(null);
      if (type === "logo" && logoRef.current) logoRef.current.value = "";
      if (type === "cover" && coverRef.current) coverRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Logo */}
      <div className="flex items-start gap-4">
        <button
          type="button"
          onClick={() => logoRef.current?.click()}
          className="relative w-20 h-20 rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50 flex items-center justify-center overflow-hidden shrink-0 hover:border-orange-300 transition-colors"
        >
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt="Logo"
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <ImageIcon className="w-7 h-7 text-zinc-300" />
          )}
          {uploading === "logo" && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
              <span className="text-xs text-zinc-500">Mengunggah...</span>
            </div>
          )}
        </button>
        <div>
          <p className="text-sm font-medium text-zinc-900">Logo</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            Tampil di header menu. Ukuran persegi, min. 200×200.
          </p>
          <button
            type="button"
            onClick={() => logoRef.current?.click()}
            disabled={uploading === "logo"}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            {uploading === "logo" ? "Mengunggah..." : "Pilih foto"}
          </button>
          <input
            ref={logoRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileChange(e, "logo")}
          />
        </div>
      </div>

      {/* Cover */}
      <div>
        <button
          type="button"
          onClick={() => coverRef.current?.click()}
          className="relative w-full h-36 rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50 flex items-center justify-center overflow-hidden hover:border-orange-300 transition-colors mb-3"
        >
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt="Cover"
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex flex-col items-center gap-1.5 pointer-events-none">
              <ImageIcon className="w-8 h-8 text-zinc-300" />
              <span className="text-xs text-zinc-400">
                Belum ada foto sampul
              </span>
            </div>
          )}
          {uploading === "cover" && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
              <span className="text-sm text-zinc-500">Mengunggah...</span>
            </div>
          )}
        </button>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-zinc-900">Foto Sampul</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              Banner di atas menu. Rasio 3:1 ideal (cth. 1200×400).
            </p>
          </div>
          <button
            type="button"
            onClick={() => coverRef.current?.click()}
            disabled={uploading === "cover"}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            {uploading === "cover" ? "Mengunggah..." : "Pilih foto"}
          </button>
          <input
            ref={coverRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileChange(e, "cover")}
          />
        </div>
      </div>
    </div>
  );
}

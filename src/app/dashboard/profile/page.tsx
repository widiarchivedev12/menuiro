import { redirect } from "next/navigation";
import { BusinessForm } from "@/components/dashboard/business-form";
import { ImageUpload } from "@/components/dashboard/image-upload";
import { SocialLinksForm } from "@/components/dashboard/social-links-form";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  const { data: socialLinks } = business
    ? await supabase
        .from("social_links")
        .select("*")
        .eq("business_id", business.id)
    : { data: [] };

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 pb-24 lg:pb-8 max-w-2xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-zinc-900">Profil Usaha</h2>
        <p className="text-sm text-zinc-500 mt-0.5">
          Informasi dasar tentang usaha kamu
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <section className="bg-white rounded-xl border border-zinc-100 shadow-sm p-5 sm:p-6">
          <h3 className="text-base font-semibold text-zinc-900 mb-4">
            Informasi Usaha
          </h3>
          <BusinessForm
            defaultValues={business ?? undefined}
            slugLocked={business?.slug_changed ?? false}
            isNew={!business}
          />
        </section>

        {business && (
          <>
            <section className="bg-white rounded-xl border border-zinc-100 shadow-sm p-5 sm:p-6">
              <h3 className="text-base font-semibold text-zinc-900 mb-1">
                Foto Usaha
              </h3>
              <p className="text-sm text-zinc-500 mb-5">
                Logo dan foto sampul untuk tampilan menu kamu
              </p>
              <ImageUpload
                businessId={business.id}
                currentLogoPath={business.logo_path}
                currentCoverPath={business.cover_path}
              />
            </section>

            <section className="bg-white rounded-xl border border-zinc-100 shadow-sm p-5 sm:p-6">
              <h3 className="text-base font-semibold text-zinc-900 mb-1">
                Media Sosial &amp; Pesan Antar
              </h3>
              <p className="text-sm text-zinc-500 mb-5">
                Tambahkan link agar pengunjung bisa menemukan kamu
              </p>
              <SocialLinksForm
                businessId={business.id}
                currentLinks={socialLinks ?? []}
              />
            </section>
          </>
        )}

        {!business && (
          <p className="text-sm text-zinc-400 text-center py-2">
            Simpan informasi usaha terlebih dahulu untuk menambahkan foto dan
            media sosial.
          </p>
        )}
      </div>
    </div>
  );
}

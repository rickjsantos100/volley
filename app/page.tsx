import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { AuthPanel } from "@/components/auth-panel";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const [t, supabase] = await Promise.all([
    getTranslations("HomePage"),
    createClient(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fa] px-4 py-24 text-[#101828] sm:px-6">
      <section className="w-full max-w-[430px] px-4 py-8 sm:px-6">
        <div className="mb-6 text-center">
          <h1 className="font-matchday text-4xl leading-[38px] font-bold text-[#061b6b]">
            {t("title")}
          </h1>
        </div>

        <AuthPanel />
      </section>
    </main>
  );
}

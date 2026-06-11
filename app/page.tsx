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
    <main className="flex min-h-screen items-center justify-center bg-[#fff8d8] px-4 py-10 text-[rgba(0,0,0,0.87)] sm:px-6">
      <section className="w-full max-w-[430px] px-4 py-8 sm:px-6">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-[-0.01em] text-[#0737a8]">
            {t("title")}
          </h1>
        </div>

        <AuthPanel />
      </section>
    </main>
  );
}

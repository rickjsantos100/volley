import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { AuthPanel } from "@/components/auth-panel";
import { createClient } from "@/lib/supabase/server";

type HomeProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

function getErrorKey(error: string | undefined) {
  if (
    error === "invalid-email" ||
    error === "invalid-password" ||
    error === "login-failed" ||
    error === "missing-name" ||
    error === "email-confirmation-enabled" ||
    error === "signup-failed"
  ) {
    return error;
  }

  return null;
}

export default async function Home({ searchParams }: HomeProps) {
  const [{ error }, t, supabase] = await Promise.all([
    searchParams,
    getTranslations("HomePage"),
    createClient(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  const errorKey = getErrorKey(error);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f2f0eb] px-4 py-10 text-[rgba(0,0,0,0.87)] sm:px-6">
      <section className="relative flex min-h-[720px] w-full max-w-[430px] flex-col px-4 py-8 sm:px-6">
        <div className="pt-20 text-center">
          <h1 className="text-2xl font-semibold tracking-[-0.01em] text-[#006241]">
            {t("title")}
          </h1>
        </div>

        <div className="mt-24">
          <AuthPanel errorKey={errorKey} redirectTo="/" />
        </div>
      </section>
    </main>
  );
}

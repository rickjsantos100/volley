import Link from "next/link";
import { AccountMenu } from "@/components/account-menu";
import { LanguageToggle } from "@/components/language-toggle";
import { createClient } from "@/lib/supabase/server";

type Profile = {
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
};

function getInitials(profile: Profile | null, email: string | undefined) {
  const nameParts = [profile?.first_name, profile?.last_name].filter(Boolean);

  if (nameParts.length > 0) {
    return nameParts
      .map((part) => part?.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  if (profile?.display_name) {
    return profile.display_name
      .split(" ")
      .filter(Boolean)
      .map((part) => part.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  return (email?.charAt(0) || "?").toUpperCase();
}

function getLabel(profile: Profile | null, email: string | undefined) {
  const name =
    profile?.display_name ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");

  return name || email || "Account";
}

export async function GlobalHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("display_name, first_name, last_name")
        .eq("id", user.id)
        .maybeSingle<Profile>()
    : { data: null };

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-[#f2f0eb]/95 shadow-[0_1px_3px_rgba(0,0,0,0.1),0_2px_2px_rgba(0,0,0,0.06),0_0_2px_rgba(0,0,0,0.07)] backdrop-blur">
      <div className="relative mx-auto grid h-16 w-full grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 sm:h-[72px] sm:px-6 lg:h-20 lg:px-10">
        <div className="justify-self-start">
          {user ? (
            <AccountMenu
              initials={getInitials(profile, user.email)}
              label={getLabel(profile, user.email)}
            />
          ) : null}
        </div>

        <Link
          href="/dashboard"
          className="justify-self-center text-lg font-semibold tracking-[-0.01em] text-[#006241] transition hover:text-[#00754A] active:scale-95 sm:text-xl"
        >
          Voley Lisboa
        </Link>

        <div className="justify-self-end">
          <LanguageToggle />
        </div>
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-full h-8 bg-gradient-to-b from-[#f2f0eb]/95 to-[#f2f0eb]/0"
      />
    </header>
  );
}

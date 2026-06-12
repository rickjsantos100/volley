import Link from "next/link";
import Image from "next/image";
import { AccountMenu } from "@/components/account-menu";
import { LanguageToggle } from "@/components/language-toggle";
import { createClient } from "@/lib/supabase/server";

type Profile = {
  avatar_path: string | null;
  avatar_updated_at: string | null;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
};

function getAvatarUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profile: Profile | null,
) {
  if (!profile?.avatar_path) {
    return "";
  }

  const { data } = supabase.storage
    .from("avatars")
    .getPublicUrl(profile.avatar_path);
  const version = profile.avatar_updated_at
    ? `?v=${encodeURIComponent(profile.avatar_updated_at)}`
    : "";

  return `${data.publicUrl}${version}`;
}

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
        .select("avatar_path, avatar_updated_at, display_name, first_name, last_name")
        .eq("id", user.id)
        .maybeSingle<Profile>()
    : { data: null };
  const avatarUrl = getAvatarUrl(supabase, profile);

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-[#fff8d8]/95 shadow-[0_1px_3px_rgba(0,0,0,0.1),0_2px_2px_rgba(0,0,0,0.06),0_0_2px_rgba(0,0,0,0.07)] backdrop-blur">
      <div className="relative mx-auto grid h-16 w-full grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 sm:h-[72px] sm:px-6 lg:h-20 lg:px-10">
        <div className="justify-self-start">
          {user ? (
            <AccountMenu
              avatarPath={profile?.avatar_path ?? ""}
              avatarUrl={avatarUrl}
              firstName={profile?.first_name ?? ""}
              initials={getInitials(profile, user.email)}
              label={getLabel(profile, user.email)}
              lastName={profile?.last_name ?? ""}
              userId={user.id}
            />
          ) : null}
        </div>

        <Link
          href="/dashboard"
          className="flex items-center gap-2 justify-self-center text-lg font-semibold tracking-[-0.01em] text-[#0737a8] transition hover:text-[#0b46c7] active:scale-95 sm:gap-3 sm:text-xl"
        >
          <span>Voley Lisboa</span>
          <Image
            alt=""
            aria-hidden="true"
            className="size-8 shrink-0 rounded-full object-contain sm:size-9"
            height={36}
            src="/ball.png"
            width={36}
          />
        </Link>

        <div className="justify-self-end">
          <LanguageToggle />
        </div>
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-full h-8 bg-gradient-to-b from-[#fff8d8]/95 to-[#fff8d8]/0"
      />
    </header>
  );
}

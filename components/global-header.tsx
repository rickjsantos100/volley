import Link from "next/link";
import Image from "next/image";
import { AccountMenu } from "@/components/account-menu";
import { LanguageToggle } from "@/components/language-toggle";
import { cx, pressedSurfaceClassName } from "@/components/ui/class-name";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

function getAvatarUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profile: Awaited<ReturnType<typeof getCurrentProfile>>,
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

function getInitials(
  profile: Awaited<ReturnType<typeof getCurrentProfile>>,
  email: string | undefined,
) {
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

function getLabel(
  profile: Awaited<ReturnType<typeof getCurrentProfile>>,
  email: string | undefined,
) {
  const name =
    profile?.display_name ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");

  return name || email || "Account";
}

export async function GlobalHeader() {
  const [supabase, user, profile] = await Promise.all([
    createClient(),
    getCurrentUser(),
    getCurrentProfile(),
  ]);
  const avatarUrl = getAvatarUrl(supabase, profile);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[#dde2ea] bg-white/95 shadow-[0_2px_8px_rgba(16,24,40,0.06)] backdrop-blur">
      <div className="relative mx-auto grid h-16 w-full max-w-[1120px] grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 sm:px-6 lg:px-8">
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
          className={cx(
            pressedSurfaceClassName,
            "flex items-center gap-2 rounded-lg px-2 py-1 font-bold text-[#061b6b] transition-colors hover:text-[#0737a8] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#0737a8]/20 sm:gap-3",
          )}
        >
          <span className="font-matchday text-xl sm:text-2xl">Voley Lisboa</span>
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
    </header>
  );
}

import { AccountMenu } from "@/components/account-menu";
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

export async function GlobalAccountMenu() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, first_name, last_name")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  return (
    <div className="fixed top-4 left-4 z-50 sm:top-6 sm:left-6">
      <AccountMenu
        initials={getInitials(profile, user.email)}
        label={getLabel(profile, user.email)}
      />
    </div>
  );
}

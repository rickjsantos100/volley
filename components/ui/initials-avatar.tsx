import { cx } from "./class-name";
import { AvatarImage } from "./avatar-image";

type InitialsAvatarProps = {
  avatarUrl?: string | null;
  className?: string;
  email?: string | null;
  name?: string | null;
  size?: number;
};

function getInitials(name?: string | null, email?: string | null) {
  if (name) {
    const initials = name
      .split(" ")
      .filter(Boolean)
      .map((part) => part.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase();

    if (initials) {
      return initials;
    }
  }

  return (email?.charAt(0) || "?").toUpperCase();
}

export function InitialsAvatar({
  avatarUrl,
  className,
  email,
  name,
  size = 44,
}: InitialsAvatarProps) {
  return (
    <span
      className={cx(
        "flex size-11 shrink-0 items-center justify-center rounded-full bg-[#061b6b] text-sm font-bold text-white",
        className,
      )}
    >
      {avatarUrl ? (
        <AvatarImage
          size={size}
          className="size-full rounded-full object-cover"
          src={avatarUrl}
        />
      ) : (
        getInitials(name, email)
      )}
    </span>
  );
}

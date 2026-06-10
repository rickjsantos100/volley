import { cx } from "./class-name";

type InitialsAvatarProps = {
  className?: string;
  email?: string | null;
  name?: string | null;
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
  className,
  email,
  name,
}: InitialsAvatarProps) {
  return (
    <span
      className={cx(
        "flex size-11 shrink-0 items-center justify-center rounded-full bg-[#00754A] text-sm font-semibold text-white",
        className,
      )}
    >
      {getInitials(name, email)}
    </span>
  );
}

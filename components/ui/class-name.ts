export function cx(...classes: Array<false | null | string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export const pressedSurfaceClassName =
  "relative overflow-hidden [-webkit-tap-highlight-color:transparent] after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:bg-[#101828]/10 after:opacity-0 after:transition-opacity after:content-[''] active:after:opacity-100 disabled:after:opacity-0 aria-disabled:after:opacity-0";

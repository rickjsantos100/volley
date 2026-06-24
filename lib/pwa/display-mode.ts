"use client";

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

export function isInstalledPwaDisplayMode() {
  return Boolean(
    window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      window.matchMedia("(display-mode: minimal-ui)").matches ||
      (navigator as NavigatorWithStandalone).standalone,
  );
}

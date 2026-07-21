"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

export function TutorialLink() {
  const pathname = usePathname();
  const t = useTranslations("TutorialLink");

  if (pathname !== "/") {
    return null;
  }

  return (
    <Link
      aria-label={t("label")}
      className="flex size-11 items-center justify-center rounded-[10px] border border-[#dde2ea] bg-white text-[#0737a8] transition-[background-color,border-color,box-shadow,transform] hover:border-[#0737a8] hover:bg-[#eef3ff] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#0737a8]/20 active:translate-y-px"
      href="/tutorial"
    >
      <svg
        aria-hidden="true"
        fill="none"
        height="24"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        width="24"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M9.6 9a2.4 2.4 0 1 1 4.48 1.18c-.62 1.1-2.08 1.42-2.08 2.82" />
        <path d="M12 16.8h.01" />
      </svg>
    </Link>
  );
}

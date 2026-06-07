"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { logOut } from "@/app/dashboard/actions";

type AccountMenuProps = {
  initials: string;
  label: string;
};

export function AccountMenu({ initials, label }: AccountMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("AccountMenu");

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-label={t("openMenu", { name: label })}
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        className="flex size-11 items-center justify-center rounded-full border border-[#00754A] bg-[#00754A] text-sm font-semibold text-white shadow-[0_0_0.5px_0_rgba(0,0,0,0.14),0_1px_1px_0_rgba(0,0,0,0.18)] transition active:scale-95"
      >
        {initials}
      </button>

      {isOpen ? (
        <div className="absolute top-14 left-0 w-52 rounded-xl bg-[#f9f9f9] p-2 shadow-[0_4px_12px_rgba(0,0,0,0.14)]">
          <p className="px-3 py-2 text-sm font-semibold text-[#33433d]">
            {label}
          </p>
          <Link
            href="/profile"
            onClick={() => setIsOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm font-medium text-[rgba(0,0,0,0.87)] transition hover:bg-white"
          >
            {t("profile")}
          </Link>
          <form action={logOut}>
            <button className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-[#c82014] transition hover:bg-white">
              {t("signOut")}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

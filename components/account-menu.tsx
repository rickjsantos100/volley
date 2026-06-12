"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { logOut } from "@/app/dashboard/actions";
import { ProfileForm } from "@/components/profile-form";
import { Modal } from "@/components/ui/modal";

type AccountMenuProps = {
  avatarPath: string;
  avatarUrl: string;
  firstName: string;
  initials: string;
  label: string;
  lastName: string;
  userId: string;
};

export function AccountMenu({
  avatarPath,
  avatarUrl,
  firstName,
  initials,
  label,
  lastName,
  userId,
}: AccountMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const accountT = useTranslations("AccountMenu");
  const profileT = useTranslations("ProfilePage");

  return (
    <>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={accountT("openProfile", { name: label })}
        onClick={() => setIsOpen(true)}
        className="ripple flex size-11 items-center justify-center rounded-full border border-[#ffd21a] bg-[#ffd21a] text-sm font-semibold text-[#061b6b] shadow-[0_0_0.5px_0_rgba(0,0,0,0.14),0_1px_1px_0_rgba(0,0,0,0.18)] transition active:scale-95"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            className="size-full rounded-full object-cover"
            src={avatarUrl}
          />
        ) : (
          initials
        )}
      </button>

      <Modal
        onClose={() => setIsOpen(false)}
        open={isOpen}
        title={profileT("title")}
      >
        <div className="mt-6 space-y-4">
          <ProfileForm
            avatarPath={avatarPath}
            avatarUrl={avatarUrl}
            firstName={firstName}
            lastName={lastName}
            onSaved={() => setIsOpen(false)}
            userId={userId}
          />
          <button
            className="ripple ripple-dark w-full rounded-full border border-[#c82014] bg-white px-5 py-3 text-sm font-semibold text-[#c82014] transition active:scale-95"
            onClick={() => setIsLogoutConfirmOpen(true)}
            type="button"
          >
            {accountT("signOut")}
          </button>
        </div>
      </Modal>

      <Modal
        onClose={() => setIsLogoutConfirmOpen(false)}
        open={isLogoutConfirmOpen}
        title={accountT("confirmLogoutTitle")}
      >
        <div className="mt-6 space-y-5">
          <p className="text-base leading-7 text-[#26375f]">
            {accountT("confirmLogoutMessage")}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              className="ripple ripple-dark rounded-full border border-[#0737a8] bg-white px-5 py-3 text-sm font-semibold text-[#0737a8] transition active:scale-95"
              onClick={() => setIsLogoutConfirmOpen(false)}
              type="button"
            >
              {accountT("cancelLogout")}
            </button>
            <form action={logOut}>
              <button className="ripple ripple-dark w-full rounded-full border border-[#c82014] bg-white px-5 py-3 text-sm font-semibold text-[#c82014] transition active:scale-95">
                {accountT("confirmLogoutButton")}
              </button>
            </form>
          </div>
        </div>
      </Modal>
    </>
  );
}

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { logOut } from "@/app/dashboard/actions";
import { ProfileForm } from "@/components/profile-form";
import { Button, SubmitButton } from "@/components/ui/button";
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
      <Button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={accountT("openProfile", { name: label })}
        className="size-11 rounded-full border-[#dde2ea] p-0 text-sm shadow-sm hover:border-[#0737a8] [&>span:last-child]:size-full [&>span:last-child]:overflow-hidden [&>span:last-child]:rounded-full"
        onClick={() => setIsOpen(true)}
        type="button"
        variant="outline"
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
      </Button>

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
          <Button
            fullWidth
            onClick={() => setIsLogoutConfirmOpen(true)}
            type="button"
            variant="dangerOutline"
          >
            {accountT("signOut")}
          </Button>
        </div>
      </Modal>

      <Modal
        onClose={() => setIsLogoutConfirmOpen(false)}
        open={isLogoutConfirmOpen}
        title={accountT("confirmLogoutTitle")}
      >
        <div className="mt-6 space-y-5">
          <p className="text-base leading-7 text-[#667085]">
            {accountT("confirmLogoutMessage")}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              onClick={() => setIsLogoutConfirmOpen(false)}
              type="button"
              variant="outline"
            >
              {accountT("cancelLogout")}
            </Button>
            <form action={logOut}>
              <SubmitButton fullWidth variant="dangerOutline">
                {accountT("confirmLogoutButton")}
              </SubmitButton>
            </form>
          </div>
        </div>
      </Modal>
    </>
  );
}

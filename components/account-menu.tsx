"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { logOut } from "@/app/dashboard/actions";
import { ProfileForm } from "@/components/profile-form";
import { PushNotificationControls } from "@/components/push-notification-controls";
import { EmailNotificationControls } from "@/components/email-notification-controls";
import { Button, SubmitButton } from "@/components/ui/button";
import { cx, pressedSurfaceClassName } from "@/components/ui/class-name";
import { Modal, ModalActions } from "@/components/ui/modal";

type AccountMenuProps = {
  avatarPath: string;
  avatarUrl: string;
  emailNotificationsEnabled: boolean;
  firstName: string;
  initials: string;
  label: string;
  lastName: string;
  publicVapidKey: string;
  userId: string;
};

type PendingProfileExit = "close" | "signOut" | null;

export function AccountMenu({
  avatarPath,
  avatarUrl,
  emailNotificationsEnabled,
  firstName,
  initials,
  label,
  lastName,
  publicVapidKey,
  userId,
}: AccountMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isProfileDirty, setIsProfileDirty] = useState(false);
  const [pendingProfileExit, setPendingProfileExit] =
    useState<PendingProfileExit>(null);
  const [profileFormVersion, setProfileFormVersion] = useState(0);
  const accountT = useTranslations("AccountMenu");
  const profileT = useTranslations("ProfilePage");

  useEffect(() => {
    if (!isOpen || !isProfileDirty) {
      return;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isOpen, isProfileDirty]);

  function requestProfileClose() {
    if (pendingProfileExit) {
      setPendingProfileExit(null);
      return false;
    }

    if (isProfileDirty) {
      setPendingProfileExit("close");
      return false;
    }

    setIsOpen(false);
    return true;
  }

  function requestSignOut() {
    if (isProfileDirty) {
      setPendingProfileExit("signOut");
      return;
    }

    setIsLogoutConfirmOpen(true);
  }

  function keepEditingProfile() {
    setPendingProfileExit(null);
  }

  function discardProfileChanges() {
    const requestedExit = pendingProfileExit;

    setPendingProfileExit(null);
    setIsProfileDirty(false);

    if (requestedExit === "signOut") {
      setProfileFormVersion((currentVersion) => currentVersion + 1);
      setIsLogoutConfirmOpen(true);
      return;
    }

    setIsOpen(false);
  }

  function handleProfileSaved() {
    setIsProfileDirty(false);
    setPendingProfileExit(null);
    setIsOpen(false);
  }

  return (
    <>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={accountT("openProfile", { name: label })}
        onClick={() => {
          setPendingProfileExit(null);
          setIsOpen(true);
        }}
        className={cx(
          pressedSurfaceClassName,
          "flex size-11 items-center justify-center rounded-full border border-[#dde2ea] bg-white text-sm font-bold text-[#061b6b] shadow-sm transition hover:border-[#0737a8] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#0737a8]/20 active:translate-y-px",
        )}
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
        onClose={requestProfileClose}
        open={isOpen}
        title={
          pendingProfileExit
            ? profileT("unsavedChangesTitle")
            : profileT("title")
        }
      >
        <div className="mt-6 space-y-4" hidden={Boolean(pendingProfileExit)}>
          <ProfileForm
            avatarPath={avatarPath}
            avatarUrl={avatarUrl}
            firstName={firstName}
            key={profileFormVersion}
            lastName={lastName}
            onDirtyChange={setIsProfileDirty}
            onSaved={handleProfileSaved}
            userId={userId}
          />
          <PushNotificationControls
            labels={{
              denied: profileT("notificationsDenied"),
              disabled: profileT("notificationsDisabled"),
              enable: profileT("notificationsEnableButton"),
              enabled: profileT("notificationsEnabled"),
              notSupported: profileT("notificationsNotSupported"),
              saveError: profileT("notificationsSaveError"),
              saved: profileT("notificationsSaved"),
              title: profileT("notificationsTitle"),
            }}
            publicKey={publicVapidKey}
          />
          <EmailNotificationControls
            enabled={emailNotificationsEnabled}
            labels={{
              disable: profileT("emailNotificationsDisable"),
              disabled: profileT("emailNotificationsDisabled"),
              enable: profileT("emailNotificationsEnable"),
              enabled: profileT("emailNotificationsEnabled"),
              error: profileT("emailNotificationsError"),
              saved: profileT("emailNotificationsSaved"),
              title: profileT("emailNotificationsTitle"),
            }}
          />
          <Button
            fullWidth
            onClick={requestSignOut}
            type="button"
            variant="dangerOutline"
          >
            {accountT("signOut")}
          </Button>
        </div>

        {pendingProfileExit ? (
          <div className="mt-6 space-y-5">
            <p className="text-base leading-7 text-[#667085]">
              {profileT("unsavedChangesMessage")}
            </p>
            <ModalActions>
              <Button
                onClick={keepEditingProfile}
                type="button"
                variant="outline"
              >
                {profileT("keepEditingButton")}
              </Button>
              <Button
                onClick={discardProfileChanges}
                type="button"
                variant="dangerOutline"
              >
                {profileT("discardChangesButton")}
              </Button>
            </ModalActions>
          </div>
        ) : null}
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
          <ModalActions>
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
          </ModalActions>
        </div>
      </Modal>
    </>
  );
}

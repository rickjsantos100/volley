"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
  phoneCountryCode: string;
  phoneNumber: string;
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
  phoneCountryCode,
  phoneNumber,
  publicVapidKey,
  userId,
}: AccountMenuProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isProfileDirty, setIsProfileDirty] = useState(false);
  const [pendingProfileExit, setPendingProfileExit] =
    useState<PendingProfileExit>(null);
  const [profileFormVersion, setProfileFormVersion] = useState(0);
  const keepModalHistoryEntryRef = useRef(false);
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

  function openTutorial() {
    if (!requestProfileClose()) {
      return;
    }

    // Replace the modal's own history entry instead of letting the modal pop it,
    // so an in-flight traversal cannot discard this navigation.
    keepModalHistoryEntryRef.current = true;
    router.replace("/tutorial");
  }

  return (
    <>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={accountT("openProfile", { name: label })}
        onClick={() => {
          keepModalHistoryEntryRef.current = false;
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
        keepHistoryEntryOnCloseRef={keepModalHistoryEntryRef}
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
            phoneCountryCode={phoneCountryCode}
            phoneNumber={phoneNumber}
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
          <details className="group rounded-xl border border-[#dde2ea] px-4 py-2">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-sm font-bold text-[#101828] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-[#0737a8]/20">
              <span>{profileT("helpTitle")}</span>
              <span
                aria-hidden="true"
                className="text-xl leading-none text-[#0737a8] transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <div className="mt-3 flex items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm leading-6 text-[#667085]">
                  {profileT("helpIntro")}
                </p>
              </div>
              <Button
                className="flex min-h-11 shrink-0 items-center justify-center rounded-[10px] border border-[#0737a8] bg-white px-4 py-2 text-sm font-bold text-[#0737a8] transition-[background-color,border-color,box-shadow,transform] hover:bg-[#eef3ff] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#0737a8]/20 active:translate-y-px"
                onClick={openTutorial}
                type="button"
                variant="outline"
              >
                {profileT("helpLink")}
              </Button>
            </div>
          </details>
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

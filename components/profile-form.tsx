"use client";

import { useActionState, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/app/profile/actions";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";

type ProfileFormProps = {
  avatarPath: string;
  avatarUrl: string;
  firstName: string;
  lastName: string;
  userId: string;
};

type ProfileFormState = {
  errors?: {
    firstName?: string;
    lastName?: string;
    form?: string;
  };
  success?: boolean;
  profile?: {
    firstName: string;
    lastName: string;
  };
};

const initialState: ProfileFormState = {};

const avatarFileName = "avatar.webp";
const avatarSize = 512;
const maxAvatarBytes = 500 * 1024;

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("imageLoadFailed"));
    };
    image.src = objectUrl;
  });
}

async function compressAvatar(file: File) {
  const image = await loadImage(file);
  const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
  const sourceX = (image.naturalWidth - sourceSize) / 2;
  const sourceY = (image.naturalHeight - sourceSize) / 2;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("compressionFailed");
  }

  const drawingContext = context;

  async function createBlob(size: number, quality: number) {
    canvas.width = size;
    canvas.height = size;
    drawingContext.drawImage(
      image,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      size,
      size,
    );

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("compressionFailed"));
          }
        },
        "image/webp",
        quality,
      );
    });
  }

  for (const size of [avatarSize, 384]) {
    for (const quality of [0.82, 0.72, 0.62]) {
      const blob = await createBlob(size, quality);

      if (blob.size <= maxAvatarBytes) {
        return blob;
      }
    }
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob && blob.size <= maxAvatarBytes) {
          resolve(blob);
        } else {
          reject(new Error("compressionFailed"));
        }
      },
      "image/webp",
      0.8,
    );
  });
}

export function ProfileForm({
  avatarPath,
  avatarUrl,
  firstName,
  lastName,
  userId,
}: ProfileFormProps) {
  const [state, formAction] = useActionState(updateProfile, initialState);
  const router = useRouter();
  const chooseInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [values, setValues] = useState({
    firstName,
    lastName,
  });
  const [currentAvatarPath, setCurrentAvatarPath] = useState(avatarPath);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(avatarUrl);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [touched, setTouched] = useState({
    firstName: false,
    lastName: false,
  });
  const t = useTranslations("ProfilePage");
  const savedValues = state.profile ?? { firstName, lastName };

  const clientErrors = {
    firstName: values.firstName.trim()
      ? null
      : t("validation.firstNameRequired"),
    lastName: values.lastName.trim()
      ? null
      : t("validation.lastNameRequired"),
  };
  const isValid = !clientErrors.firstName && !clientErrors.lastName;
  const isChanged =
    values.firstName.trim() !== savedValues.firstName ||
    values.lastName.trim() !== savedValues.lastName;
  const firstNameError =
    (touched.firstName && clientErrors.firstName) ||
    (state.errors?.firstName
      ? t(`validation.${state.errors.firstName}`)
      : null);
  const lastNameError =
    (touched.lastName && clientErrors.lastName) ||
    (state.errors?.lastName ? t(`validation.${state.errors.lastName}`) : null);

  function handleAvatarFile(file: File | undefined) {
    if (!file) {
      return;
    }

    const selectedFile = file;

    async function uploadAvatar() {
      setAvatarError(null);

      if (!selectedFile.type.startsWith("image/")) {
        setAvatarError("invalidImage");
        if (chooseInputRef.current) {
          chooseInputRef.current.value = "";
        }
        if (cameraInputRef.current) {
          cameraInputRef.current.value = "";
        }
        return;
      }

      try {
        setIsUploadingAvatar(true);
        const compressedAvatar = await compressAvatar(selectedFile);
        const supabase = createClient();
        const newAvatarPath = `${userId}/${avatarFileName}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(newAvatarPath, compressedAvatar, {
            cacheControl: "3600",
            contentType: compressedAvatar.type || "image/webp",
            upsert: true,
          });

        if (uploadError) {
          throw uploadError;
        }

        const avatarUpdatedAt = new Date().toISOString();
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            avatar_path: newAvatarPath,
            avatar_updated_at: avatarUpdatedAt,
          })
          .eq("id", userId);

        if (updateError) {
          throw updateError;
        }

        const { data } = supabase.storage
          .from("avatars")
          .getPublicUrl(newAvatarPath);
        const nextAvatarUrl = `${data.publicUrl}?v=${encodeURIComponent(avatarUpdatedAt)}`;

        setCurrentAvatarPath(newAvatarPath);
        setCurrentAvatarUrl(nextAvatarUrl);
        router.refresh();

        const stalePaths = new Set<string>();

        if (currentAvatarPath && currentAvatarPath !== newAvatarPath) {
          stalePaths.add(currentAvatarPath);
        }

        const { data: userAvatarFiles } = await supabase.storage
          .from("avatars")
          .list(userId);

        userAvatarFiles?.forEach((avatarFile) => {
          if (avatarFile.name !== avatarFileName) {
            stalePaths.add(`${userId}/${avatarFile.name}`);
          }
        });

        if (stalePaths.size > 0) {
          await supabase.storage.from("avatars").remove([...stalePaths]);
        }
      } catch {
        setAvatarError("uploadFailed");
      } finally {
        setIsUploadingAvatar(false);
        if (chooseInputRef.current) {
          chooseInputRef.current.value = "";
        }
        if (cameraInputRef.current) {
          cameraInputRef.current.value = "";
        }
      }
    }

    void uploadAvatar();
  }

  return (
    <form action={formAction} className="space-y-5">
      {state.errors?.form ? (
        <Toast variant="error">{t(`errors.${state.errors.form}`)}</Toast>
      ) : null}

      {avatarError ? (
        <Toast variant="error">{t(`errors.${avatarError}`)}</Toast>
      ) : null}

      <div className="rounded-xl bg-[#fff8d8] p-4">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#0737a8] text-2xl font-semibold text-white shadow-[0_0_0.5px_0_rgba(0,0,0,0.14),0_1px_1px_0_rgba(0,0,0,0.24)]">
            {currentAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt=""
                className="size-full object-cover"
                src={currentAvatarUrl}
              />
            ) : (
              values.firstName.charAt(0).toUpperCase() || "?"
            )}
          </div>
          <div className="space-y-3">
            <div>
              <h2 className="text-base font-semibold text-[#061b6b]">
                {t("avatarTitle")}
              </h2>
              <p className="mt-1 text-sm leading-6 text-[#26375f]">
                {t("avatarHelp")}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                className="ripple rounded-full border border-[#0737a8] bg-white px-4 py-2 text-sm font-semibold text-[#0737a8] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isUploadingAvatar}
                onClick={() => chooseInputRef.current?.click()}
                type="button"
              >
                {isUploadingAvatar ? t("avatarUploading") : t("chooseImageButton")}
              </button>
              <button
                className="ripple rounded-full border border-[#ffd21a] bg-[#ffd21a] px-4 py-2 text-sm font-semibold text-[#061b6b] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isUploadingAvatar}
                onClick={() => cameraInputRef.current?.click()}
                type="button"
              >
                {t("takePhotoButton")}
              </button>
            </div>
          </div>
        </div>
        <input
          ref={chooseInputRef}
          accept="image/*"
          className="sr-only"
          onChange={(event) => handleAvatarFile(event.target.files?.[0])}
          type="file"
        />
        <input
          ref={cameraInputRef}
          accept="image/*"
          capture="user"
          className="sr-only"
          onChange={(event) => handleAvatarFile(event.target.files?.[0])}
          type="file"
        />
      </div>

      <Field
        autoComplete="given-name"
        error={firstNameError}
        id="profile-first-name"
        label={t("firstNameLabel")}
        name="firstName"
        onBlur={() =>
          setTouched((currentTouched) => ({
            ...currentTouched,
            firstName: true,
          }))
        }
        onChange={(event) =>
          setValues((currentValues) => ({
            ...currentValues,
            firstName: event.target.value,
          }))
        }
        placeholder={t("firstNamePlaceholder")}
        required
        type="text"
        value={values.firstName}
      />

      <Field
        autoComplete="family-name"
        error={lastNameError}
        id="profile-last-name"
        label={t("lastNameLabel")}
        name="lastName"
        onBlur={() =>
          setTouched((currentTouched) => ({
            ...currentTouched,
            lastName: true,
          }))
        }
        onChange={(event) =>
          setValues((currentValues) => ({
            ...currentValues,
            lastName: event.target.value,
          }))
        }
        placeholder={t("lastNamePlaceholder")}
        required
        type="text"
        value={values.lastName}
      />

      <SubmitButton disabled={!isValid || !isChanged} fullWidth>
        {t("saveButton")}
      </SubmitButton>
    </form>
  );
}

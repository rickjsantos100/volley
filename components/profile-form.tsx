"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent,
} from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/app/profile/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Toast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";

type ProfileFormProps = {
  avatarPath: string;
  avatarUrl: string;
  firstName: string;
  lastName: string;
  onSaved?: () => void;
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

type DraftAvatar = {
  height: number;
  offsetX: number;
  offsetY: number;
  url: string;
  width: number;
  zoom: number;
};

const avatarFileName = "avatar.webp";
const avatarCropSize = 280;
const avatarOutputSize = 512;
const avatarPreviewSize = 96;
const maxAvatarBytes = 500 * 1024;
const minAvatarZoom = 1;
const maxAvatarZoom = 3;

function loadImage(source: File | string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    let objectUrl: string | null = null;
    let imageSource: string;

    if (typeof source === "string") {
      imageSource = source;
    } else {
      objectUrl = URL.createObjectURL(source);
      imageSource = objectUrl;
    }

    image.onload = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      resolve(image);
    };
    image.onerror = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      reject(new Error("imageLoadFailed"));
    };
    image.src = imageSource;
  });
}

function getBaseScale(draftAvatar: DraftAvatar, cropSize = avatarCropSize) {
  return Math.max(
    cropSize / draftAvatar.width,
    cropSize / draftAvatar.height,
  );
}

function clampOffset(offset: number, renderedSize: number, cropSize = avatarCropSize) {
  const extraSize = Math.max(0, renderedSize - cropSize);
  const limit = extraSize / 2;

  return Math.min(limit, Math.max(-limit, offset));
}

function clampDraftAvatar(draftAvatar: DraftAvatar): DraftAvatar {
  const scale = getBaseScale(draftAvatar) * draftAvatar.zoom;

  return {
    ...draftAvatar,
    offsetX: clampOffset(draftAvatar.offsetX, draftAvatar.width * scale),
    offsetY: clampOffset(draftAvatar.offsetY, draftAvatar.height * scale),
  };
}

function getDefaultDraftAvatar(draftAvatar: DraftAvatar): DraftAvatar {
  return clampDraftAvatar({
    ...draftAvatar,
    offsetX: 0,
    offsetY: 0,
    zoom: minAvatarZoom,
  });
}

function getDraftImageStyle(draftAvatar: DraftAvatar, displaySize: number) {
  const displayRatio = displaySize / avatarCropSize;
  const scale = getBaseScale(draftAvatar) * draftAvatar.zoom * displayRatio;
  const width = draftAvatar.width * scale;
  const height = draftAvatar.height * scale;

  return {
    height: `${height}px`,
    left: `${(displaySize - width) / 2 + draftAvatar.offsetX * displayRatio}px`,
    top: `${(displaySize - height) / 2 + draftAvatar.offsetY * displayRatio}px`,
    width: `${width}px`,
  };
}

async function createCompressedAvatarBlob(draftAvatar: DraftAvatar) {
  const image = await loadImage(draftAvatar.url);
  const sourceScale = getBaseScale(draftAvatar) * draftAvatar.zoom;
  const sourceSize = avatarCropSize / sourceScale;
  const sourceX =
    (draftAvatar.width - sourceSize) / 2 - draftAvatar.offsetX / sourceScale;
  const sourceY =
    (draftAvatar.height - sourceSize) / 2 - draftAvatar.offsetY / sourceScale;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("compressionFailed");
  }

  canvas.width = avatarOutputSize;
  canvas.height = avatarOutputSize;
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    avatarOutputSize,
    avatarOutputSize,
  );

  async function createBlob(quality: number) {
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

  for (const quality of [0.82, 0.72, 0.62]) {
    const blob = await createBlob(quality);

    if (blob.size <= maxAvatarBytes) {
      return blob;
    }
  }

  throw new Error("compressionFailed");
}

function clearInput(input: HTMLInputElement | null) {
  if (input) {
    input.value = "";
  }
}

export function ProfileForm({
  avatarPath,
  avatarUrl,
  firstName,
  lastName,
  onSaved,
  userId,
}: ProfileFormProps) {
  const router = useRouter();
  const chooseInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const draftAvatarRef = useRef<DraftAvatar | null>(null);
  const dragStateRef = useRef<{
    offsetX: number;
    offsetY: number;
    pointerId: number;
    startX: number;
    startY: number;
  } | null>(null);
  const [state, setState] = useState<ProfileFormState>({});
  const [values, setValues] = useState({
    firstName,
    lastName,
  });
  const [savedValues, setSavedValues] = useState({ firstName, lastName });
  const [currentAvatarPath, setCurrentAvatarPath] = useState(avatarPath);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(avatarUrl);
  const [draftAvatar, setDraftAvatar] = useState<DraftAvatar | null>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [touched, setTouched] = useState({
    firstName: false,
    lastName: false,
  });
  const t = useTranslations("ProfilePage");

  useEffect(() => {
    draftAvatarRef.current = draftAvatar;
  }, [draftAvatar]);

  useEffect(() => {
    return () => {
      if (draftAvatarRef.current) {
        URL.revokeObjectURL(draftAvatarRef.current.url);
      }
    };
  }, []);

  const clientErrors = {
    firstName: values.firstName.trim()
      ? null
      : t("validation.firstNameRequired"),
    lastName: values.lastName.trim()
      ? null
      : t("validation.lastNameRequired"),
  };
  const isValid = !clientErrors.firstName && !clientErrors.lastName;
  const isNameChanged =
    values.firstName.trim() !== savedValues.firstName ||
    values.lastName.trim() !== savedValues.lastName;
  const isChanged = isNameChanged || Boolean(draftAvatar);
  const firstNameError =
    (touched.firstName && clientErrors.firstName) ||
    (state.errors?.firstName
      ? t(`validation.${state.errors.firstName}`)
      : null);
  const lastNameError =
    (touched.lastName && clientErrors.lastName) ||
    (state.errors?.lastName ? t(`validation.${state.errors.lastName}`) : null);

  async function handleAvatarFile(file: File | undefined) {
    if (!file) {
      return;
    }

    setAvatarError(null);

    if (!file.type.startsWith("image/")) {
      setAvatarError("invalidImage");
      clearInput(chooseInputRef.current);
      clearInput(cameraInputRef.current);
      return;
    }

    let objectUrl = "";

    try {
      objectUrl = URL.createObjectURL(file);
      const image = await loadImage(objectUrl);
      const nextDraftAvatar = clampDraftAvatar({
        height: image.naturalHeight,
        offsetX: 0,
        offsetY: 0,
        url: objectUrl,
        width: image.naturalWidth,
        zoom: minAvatarZoom,
      });

      setDraftAvatar((currentDraftAvatar) => {
        if (currentDraftAvatar) {
          URL.revokeObjectURL(currentDraftAvatar.url);
        }

        return nextDraftAvatar;
      });
      setIsCropModalOpen(true);
    } catch {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      setAvatarError("invalidImage");
    } finally {
      clearInput(chooseInputRef.current);
      clearInput(cameraInputRef.current);
    }
  }

  function handleAvatarPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!draftAvatar) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      offsetX: draftAvatar.offsetX,
      offsetY: draftAvatar.offsetY,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
  }

  function handleAvatarPointerMove(event: PointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    setDraftAvatar((currentDraftAvatar) => {
      if (!currentDraftAvatar) {
        return currentDraftAvatar;
      }

      return clampDraftAvatar({
        ...currentDraftAvatar,
        offsetX:
          dragState.offsetX +
          ((event.clientX - dragState.startX) * avatarCropSize) /
            avatarCropSize,
        offsetY:
          dragState.offsetY +
          ((event.clientY - dragState.startY) * avatarCropSize) /
            avatarCropSize,
      });
    });
  }

  function handleAvatarPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (dragStateRef.current?.pointerId === event.pointerId) {
      dragStateRef.current = null;
    }
  }

  async function uploadAvatar() {
    if (!draftAvatar) {
      return null;
    }

    const compressedAvatar = await createCompressedAvatarBlob(draftAvatar);
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

    const { data } = supabase.storage.from("avatars").getPublicUrl(newAvatarPath);
    const nextAvatarUrl = `${data.publicUrl}?v=${encodeURIComponent(avatarUpdatedAt)}`;

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

    return { path: newAvatarPath, url: nextAvatarUrl };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ firstName: true, lastName: true });

    if (!isValid || !isChanged) {
      return;
    }

    setAvatarError(null);
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);
    const nextState = await updateProfile(state, formData);
    setState(nextState);

    if (nextState.errors) {
      setIsSaving(false);
      return;
    }

    try {
      const avatarResult = await uploadAvatar();

      setSavedValues({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
      });
      setState(nextState);

      if (avatarResult) {
        setCurrentAvatarPath(avatarResult.path);
        setCurrentAvatarUrl(avatarResult.url);
        setDraftAvatar((currentDraftAvatar) => {
          if (currentDraftAvatar) {
            URL.revokeObjectURL(currentDraftAvatar.url);
          }

          return null;
        });
      }

      router.refresh();
      onSaved?.();
    } catch {
      setAvatarError("uploadFailed");
    } finally {
      setIsSaving(false);
    }
  }

  function handleCloseCropModal() {
    setDraftAvatar((currentDraftAvatar) =>
      currentDraftAvatar ? getDefaultDraftAvatar(currentDraftAvatar) : null,
    );
    setIsCropModalOpen(false);
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {state.errors?.form ? (
        <Toast variant="error">{t(`errors.${state.errors.form}`)}</Toast>
      ) : null}

      {avatarError ? (
        <Toast variant="error">{t(`errors.${avatarError}`)}</Toast>
      ) : null}

      <div className="rounded-xl border border-[#dde2ea] bg-[#f5f7fa] p-4">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <div className="relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#061b6b] text-2xl font-bold text-white shadow-[0_8px_24px_rgba(16,24,40,0.12)]">
            {draftAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt=""
                className="pointer-events-none absolute max-w-none"
                src={draftAvatar.url}
                style={getDraftImageStyle(draftAvatar, avatarPreviewSize)}
              />
            ) : currentAvatarUrl ? (
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
              <p className="mt-1 text-sm leading-6 text-[#667085]">
                {t("avatarHelp")}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                className="min-h-11 rounded-[10px] border border-[#0737a8] bg-white px-4 py-2 text-sm font-bold text-[#0737a8] transition hover:bg-[#eef3ff] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#0737a8]/20 disabled:cursor-default disabled:opacity-50"
                disabled={isSaving}
                onClick={() => chooseInputRef.current?.click()}
                type="button"
              >
                {t("chooseImageButton")}
              </button>
              <button
                className="min-h-11 rounded-[10px] border border-[#ffd21a] bg-[#ffd21a] px-4 py-2 text-sm font-bold text-[#061b6b] transition hover:bg-[#f2c600] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#0737a8]/20 disabled:cursor-default disabled:opacity-50"
                disabled={isSaving}
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
          onChange={(event) => void handleAvatarFile(event.target.files?.[0])}
          type="file"
        />
        <input
          ref={cameraInputRef}
          accept="image/*"
          capture="user"
          className="sr-only"
          onChange={(event) => void handleAvatarFile(event.target.files?.[0])}
          type="file"
        />
      </div>

      <Modal
        onClose={handleCloseCropModal}
        open={isCropModalOpen && Boolean(draftAvatar)}
        title={t("avatarCropTitle")}
      >
        {draftAvatar ? (
          <div className="mt-6 space-y-5">
            <p className="text-sm leading-6 text-[#667085]">
              {t("avatarCropHelp")}
            </p>
            <div className="flex justify-center">
              <div
                className="relative touch-none select-none overflow-hidden rounded-xl bg-[#061b6b]"
                onPointerCancel={handleAvatarPointerUp}
                onPointerDown={handleAvatarPointerDown}
                onPointerMove={handleAvatarPointerMove}
                onPointerUp={handleAvatarPointerUp}
                style={{ height: avatarCropSize, width: avatarCropSize }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt=""
                  className="pointer-events-none absolute max-w-none"
                  src={draftAvatar.url}
                  style={getDraftImageStyle(draftAvatar, avatarCropSize)}
                />
                <div className="pointer-events-none absolute inset-0 rounded-full border-2 border-white shadow-[0_0_0_999px_rgba(0,0,0,0.42)]" />
              </div>
            </div>
            <label className="block text-sm font-semibold text-[#101828]">
              <span>{t("avatarZoomLabel")}</span>
              <input
                aria-label={t("avatarZoomLabel")}
                className="mt-2 w-full accent-[#ffd21a]"
                max={maxAvatarZoom}
                min={minAvatarZoom}
                onChange={(event) => {
                  const zoom = Number(event.target.value);

                  setDraftAvatar((currentDraftAvatar) =>
                    currentDraftAvatar
                      ? clampDraftAvatar({ ...currentDraftAvatar, zoom })
                      : currentDraftAvatar,
                  );
                }}
                step="0.05"
                type="range"
                value={draftAvatar.zoom}
              />
            </label>
            <Button fullWidth onClick={() => setIsCropModalOpen(false)} type="button">
              {t("avatarCropButton")}
            </Button>
          </div>
        ) : null}
      </Modal>

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

      <Button disabled={!isValid || !isChanged || isSaving} fullWidth loading={isSaving}>
        {t("saveButton")}
      </Button>
    </form>
  );
}

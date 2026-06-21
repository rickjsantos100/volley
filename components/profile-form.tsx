"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type PointerEvent,
  type WheelEvent,
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

type CameraStatus = "capturing" | "error" | "ready" | "requesting";

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

function zoomDraftAvatar(
  draftAvatar: DraftAvatar,
  zoom: number,
  focalX = 0,
  focalY = 0,
) {
  const nextZoom = Math.min(maxAvatarZoom, Math.max(minAvatarZoom, zoom));
  const zoomRatio = nextZoom / draftAvatar.zoom;

  return clampDraftAvatar({
    ...draftAvatar,
    offsetX: focalX - (focalX - draftAvatar.offsetX) * zoomRatio,
    offsetY: focalY - (focalY - draftAvatar.offsetY) * zoomRatio,
    zoom: nextZoom,
  });
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

function stopMediaStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function createCameraFrameBlob(video: HTMLVideoElement) {
  return new Promise<Blob>((resolve, reject) => {
    if (!video.videoWidth || !video.videoHeight) {
      reject(new Error("cameraNotReady"));
      return;
    }

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      reject(new Error("cameraCaptureFailed"));
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("cameraCaptureFailed"));
        }
      },
      "image/jpeg",
      0.92,
    );
  });
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
  const cameraRequestIdRef = useRef(0);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const draftAvatarRef = useRef<DraftAvatar | null>(null);
  const dragStateRef = useRef<{
    offsetX: number;
    offsetY: number;
    pointerId: number;
    startX: number;
    startY: number;
  } | null>(null);
  const pointerPositionsRef = useRef(
    new Map<number, { clientX: number; clientY: number }>(),
  );
  const pinchStateRef = useRef<{
    centerX: number;
    centerY: number;
    distance: number;
    offsetX: number;
    offsetY: number;
    zoom: number;
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
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraStatus, setCameraStatus] =
    useState<CameraStatus>("requesting");
  const [cameraError, setCameraError] = useState<string | null>(null);
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
      cameraRequestIdRef.current += 1;
      stopMediaStream(cameraStreamRef.current);
      cameraStreamRef.current = null;

      if (draftAvatarRef.current) {
        URL.revokeObjectURL(draftAvatarRef.current.url);
      }
    };
  }, []);

  useEffect(() => {
    const video = cameraVideoRef.current;

    if (!isCameraModalOpen || !cameraStream || !video) {
      return;
    }

    video.srcObject = cameraStream;
    void video.play().catch(() => {
      setCameraError("cameraUnavailable");
      setCameraStatus("error");
      stopMediaStream(cameraStream);
      cameraStreamRef.current = null;
      setCameraStream(null);
    });

    return () => {
      if (video.srcObject === cameraStream) {
        video.srcObject = null;
      }
    };
  }, [cameraStream, isCameraModalOpen]);

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

  function closeCameraModal() {
    cameraRequestIdRef.current += 1;
    stopMediaStream(cameraStreamRef.current);
    cameraStreamRef.current = null;
    setCameraStream(null);
    setCameraError(null);
    setCameraStatus("requesting");
    setIsCameraModalOpen(false);
  }

  async function openDesktopCamera() {
    const requestId = cameraRequestIdRef.current + 1;
    cameraRequestIdRef.current = requestId;
    stopMediaStream(cameraStreamRef.current);
    cameraStreamRef.current = null;
    setCameraStream(null);
    setCameraError(null);
    setCameraStatus("requesting");
    setIsCameraModalOpen(true);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("cameraUnavailable");
      setCameraStatus("error");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "user" },
          height: { ideal: 1080 },
          width: { ideal: 1440 },
        },
      });

      if (cameraRequestIdRef.current !== requestId) {
        stopMediaStream(stream);
        return;
      }

      cameraStreamRef.current = stream;
      setCameraStream(stream);
    } catch (error) {
      if (cameraRequestIdRef.current !== requestId) {
        return;
      }

      setCameraError(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "cameraPermissionDenied"
          : "cameraUnavailable",
      );
      setCameraStatus("error");
    }
  }

  function handleTakePhoto() {
    const hasFinePointer =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(any-pointer: fine)").matches;

    if (!hasFinePointer) {
      cameraInputRef.current?.click();
      return;
    }

    void openDesktopCamera();
  }

  async function captureCameraPhoto() {
    const video = cameraVideoRef.current;

    if (!video || cameraStatus !== "ready") {
      return;
    }

    setCameraError(null);
    setCameraStatus("capturing");

    try {
      const blob = await createCameraFrameBlob(video);
      const file = new File([blob], `camera-${Date.now()}.jpg`, {
        type: blob.type,
      });

      await handleAvatarFile(file);
      closeCameraModal();
    } catch {
      setCameraError("cameraCaptureFailed");
      setCameraStatus("ready");
    }
  }

  function chooseImageFromCameraModal() {
    closeCameraModal();
    chooseInputRef.current?.click();
  }

  function handleAvatarPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!draftAvatar) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    pointerPositionsRef.current.set(event.pointerId, {
      clientX: event.clientX,
      clientY: event.clientY,
    });

    if (pointerPositionsRef.current.size >= 2) {
      if (pointerPositionsRef.current.size > 2) {
        return;
      }

      const [firstPointer, secondPointer] = [
        ...pointerPositionsRef.current.values(),
      ];
      const cropBounds = event.currentTarget.getBoundingClientRect();
      const displayRatio = avatarCropSize / cropBounds.width;

      pinchStateRef.current = {
        centerX:
          ((firstPointer.clientX + secondPointer.clientX) / 2 -
            cropBounds.left -
            cropBounds.width / 2) *
          displayRatio,
        centerY:
          ((firstPointer.clientY + secondPointer.clientY) / 2 -
            cropBounds.top -
            cropBounds.height / 2) *
          displayRatio,
        distance: Math.max(
          1,
          Math.hypot(
            secondPointer.clientX - firstPointer.clientX,
            secondPointer.clientY - firstPointer.clientY,
          ),
        ),
        offsetX: draftAvatar.offsetX,
        offsetY: draftAvatar.offsetY,
        zoom: draftAvatar.zoom,
      };
      dragStateRef.current = null;
      return;
    }

    dragStateRef.current = {
      offsetX: draftAvatar.offsetX,
      offsetY: draftAvatar.offsetY,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
  }

  function handleAvatarPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (pointerPositionsRef.current.has(event.pointerId)) {
      pointerPositionsRef.current.set(event.pointerId, {
        clientX: event.clientX,
        clientY: event.clientY,
      });
    }

    const pinchState = pinchStateRef.current;

    if (pinchState && pointerPositionsRef.current.size >= 2) {
      const [firstPointer, secondPointer] = [
        ...pointerPositionsRef.current.values(),
      ];
      const distance = Math.hypot(
        secondPointer.clientX - firstPointer.clientX,
        secondPointer.clientY - firstPointer.clientY,
      );
      const cropBounds = event.currentTarget.getBoundingClientRect();
      const displayRatio = avatarCropSize / cropBounds.width;
      const centerX =
        ((firstPointer.clientX + secondPointer.clientX) / 2 -
          cropBounds.left -
          cropBounds.width / 2) *
        displayRatio;
      const centerY =
        ((firstPointer.clientY + secondPointer.clientY) / 2 -
          cropBounds.top -
          cropBounds.height / 2) *
        displayRatio;
      const zoom = Math.min(
        maxAvatarZoom,
        Math.max(
          minAvatarZoom,
          pinchState.zoom * (distance / pinchState.distance),
        ),
      );
      const zoomRatio = zoom / pinchState.zoom;

      setDraftAvatar((currentDraftAvatar) =>
        currentDraftAvatar
          ? clampDraftAvatar({
              ...currentDraftAvatar,
              offsetX:
                centerX -
                (pinchState.centerX - pinchState.offsetX) * zoomRatio,
              offsetY:
                centerY -
                (pinchState.centerY - pinchState.offsetY) * zoomRatio,
              zoom,
            })
          : currentDraftAvatar,
      );
      return;
    }

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
    pointerPositionsRef.current.delete(event.pointerId);
    pinchStateRef.current = null;

    if (dragStateRef.current?.pointerId === event.pointerId) {
      dragStateRef.current = null;
    }

    if (
      pointerPositionsRef.current.size === 1 &&
      draftAvatarRef.current
    ) {
      const [remainingPointer] = pointerPositionsRef.current.entries();

      dragStateRef.current = {
        offsetX: draftAvatarRef.current.offsetX,
        offsetY: draftAvatarRef.current.offsetY,
        pointerId: remainingPointer[0],
        startX: remainingPointer[1].clientX,
        startY: remainingPointer[1].clientY,
      };
    }
  }

  function handleAvatarWheel(event: WheelEvent<HTMLDivElement>) {
    if (!draftAvatar) {
      return;
    }

    event.preventDefault();
    const cropBounds = event.currentTarget.getBoundingClientRect();
    const displayRatio = avatarCropSize / cropBounds.width;
    const focalX =
      (event.clientX - cropBounds.left - cropBounds.width / 2) * displayRatio;
    const focalY =
      (event.clientY - cropBounds.top - cropBounds.height / 2) * displayRatio;
    const deltaMultiplier = event.deltaMode === 1 ? 16 : 1;
    const zoomFactor = Math.exp(-event.deltaY * deltaMultiplier * 0.002);

    setDraftAvatar((currentDraftAvatar) =>
      currentDraftAvatar
        ? zoomDraftAvatar(
            currentDraftAvatar,
            currentDraftAvatar.zoom * zoomFactor,
            focalX,
            focalY,
          )
        : currentDraftAvatar,
    );
  }

  function handleAvatarKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const panStep = 8;
    const zoomStep = 0.1;

    if (["ArrowDown", "ArrowLeft", "ArrowRight", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      setDraftAvatar((currentDraftAvatar) => {
        if (!currentDraftAvatar) {
          return currentDraftAvatar;
        }

        return clampDraftAvatar({
          ...currentDraftAvatar,
          offsetX:
            currentDraftAvatar.offsetX +
            (event.key === "ArrowLeft"
              ? -panStep
              : event.key === "ArrowRight"
                ? panStep
                : 0),
          offsetY:
            currentDraftAvatar.offsetY +
            (event.key === "ArrowUp"
              ? -panStep
              : event.key === "ArrowDown"
                ? panStep
                : 0),
        });
      });
      return;
    }

    if (["+", "=", "-"].includes(event.key)) {
      event.preventDefault();
      setDraftAvatar((currentDraftAvatar) =>
        currentDraftAvatar
          ? zoomDraftAvatar(
              currentDraftAvatar,
              currentDraftAvatar.zoom +
                (event.key === "-" ? -zoomStep : zoomStep),
            )
          : currentDraftAvatar,
      );
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
                onClick={handleTakePhoto}
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
        onClose={
          isCameraModalOpen ? closeCameraModal : handleCloseCropModal
        }
        open={
          isCameraModalOpen ||
          (isCropModalOpen && Boolean(draftAvatar))
        }
        title={
          isCameraModalOpen ? t("cameraTitle") : t("avatarCropTitle")
        }
      >
        {isCameraModalOpen ? (
          <div className="mt-6 space-y-5">
            {cameraError ? (
              <p
                className="rounded-xl border border-[#c73a3a]/25 bg-[#c73a3a]/8 px-4 py-3 text-sm leading-6 text-[#8f2626]"
                role="alert"
              >
                {t(`errors.${cameraError}`)}
              </p>
            ) : null}

            {cameraStatus === "requesting" ? (
              <div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-[#061b6b] px-6 text-center text-sm font-semibold text-white">
                {t("cameraRequesting")}
              </div>
            ) : null}

            {cameraStream ? (
              <div className="aspect-[4/3] overflow-hidden rounded-xl bg-[#061b6b]">
                <video
                  aria-label={t("cameraPreviewLabel")}
                  className="size-full -scale-x-100 object-cover"
                  muted
                  onLoadedMetadata={() => setCameraStatus("ready")}
                  playsInline
                  ref={cameraVideoRef}
                />
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              {cameraStatus === "error" ? (
                <Button
                  onClick={chooseImageFromCameraModal}
                  type="button"
                  variant="outline"
                >
                  {t("cameraChooseImage")}
                </Button>
              ) : (
                <Button
                  disabled={cameraStatus !== "ready"}
                  loading={cameraStatus === "capturing"}
                  onClick={() => void captureCameraPhoto()}
                  type="button"
                >
                  {t("cameraCaptureButton")}
                </Button>
              )}
              <Button
                onClick={closeCameraModal}
                type="button"
                variant="outline"
              >
                {t("cameraCancelButton")}
              </Button>
            </div>
          </div>
        ) : draftAvatar ? (
          <div className="mt-6 space-y-5">
            <p className="text-sm leading-6 text-[#667085]">
              {t("avatarCropHelp")}
            </p>
            <div className="flex justify-center">
              <div
                aria-label={t("avatarCropInteractionLabel")}
                className="relative cursor-grab touch-none select-none overflow-hidden rounded-xl bg-[#061b6b] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#0737a8]/30 active:cursor-grabbing"
                onKeyDown={handleAvatarKeyDown}
                onPointerCancel={handleAvatarPointerUp}
                onPointerDown={handleAvatarPointerDown}
                onPointerMove={handleAvatarPointerMove}
                onPointerUp={handleAvatarPointerUp}
                onWheel={handleAvatarWheel}
                role="group"
                style={{ height: avatarCropSize, width: avatarCropSize }}
                tabIndex={0}
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
            <Button
              fullWidth
              onClick={() => setIsCropModalOpen(false)}
              type="button"
            >
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

import Image from "next/image";
import { isLocalAvatarSource } from "@/lib/avatars";

export function AvatarImage({ src, size, className }: {
  src: string;
  size: number;
  className?: string;
}) {
  return (
    <Image
      alt=""
      className={className}
      height={size}
      width={size}
      sizes={`${size}px`}
      quality={75}
      src={src}
      unoptimized={process.env.NODE_ENV === "development" &&
        isLocalAvatarSource(src, process.env.NEXT_PUBLIC_SUPABASE_URL)}
    />
  );
}

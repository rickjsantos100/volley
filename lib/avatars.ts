export const avatarCacheSeconds = 31536000;
export const avatarUploadOptions = {
  cacheControl: String(avatarCacheSeconds),
  contentType: "image/webp",
  upsert: false,
};

export function getAvatarUrl(publicUrl: string, path: string | null | undefined, updatedAt?: string | null) {
  if (!path) return "";
  // Only our new UUID filenames are known immutable. Preserve versioning for
  // all historical paths, including any older non-WebP filenames.
  const immutable = /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/i.test(path);
  return !immutable && updatedAt
    ? `${publicUrl}?v=${encodeURIComponent(updatedAt)}` : publicUrl;
}

export function avatarRemotePatterns(supabaseUrl?: string) {
  if (!supabaseUrl) return [];
  const url = new URL(supabaseUrl);
  return [{
    protocol: url.protocol.slice(0, -1) as "http" | "https",
    hostname: url.hostname,
    port: url.port,
    pathname: "/storage/v1/object/public/avatars/**",
    // Omit search deliberately for legacy ?v= timestamps; restrict host/bucket.
  }];
}

export function isLocalAvatarSource(source: string, supabaseUrl?: string) {
  if (!supabaseUrl) return false;
  try {
    const base = new URL(supabaseUrl);
    const url = new URL(source);
    return ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname) &&
      url.origin === base.origin &&
      url.pathname.startsWith("/storage/v1/object/public/avatars/");
  } catch { return false; }
}

type ReplacementOptions = {
  userId: string;
  previousPath: string;
  blob: Blob;
  upload: (path: string, blob: Blob) => Promise<void>;
  // Must atomically compare previousPath before changing the pointer.
  update: (path: string) => Promise<boolean>;
  remove: (path: string) => Promise<unknown>;
};

export async function replaceAvatar(options: ReplacementOptions) {
  const path = `${options.userId}/${crypto.randomUUID()}.webp`;
  await options.upload(path, options.blob);
  // An ambiguous/thrown update may have committed. Retain its upload rather
  // than delete an active source; only confirmed rejection is safe to clean.
  const updated = await options.update(path);
  if (!updated) {
    await options.remove(path).catch(() => undefined);
    throw new Error("avatarUpdateFailed");
  }
  if (options.previousPath && options.previousPath !== path) {
    await options.remove(options.previousPath).catch(() => undefined);
  }
  return path;
}

type RecoverableReplacementOptions = Omit<ReplacementOptions, "previousPath" | "update"> & {
  readCurrent: () => Promise<{ path: string; updatedAt: string | null }>;
  onReconciled: (current: { path: string; updatedAt: string | null }) => void;
  update: (path: string, previousPath: string) => Promise<boolean>;
};

export async function replaceAvatarWithRecovery(options: RecoverableReplacementOptions) {
  // Read before every attempt, including retries after a failed recovery read.
  // Never silently retry the write: keep the crop draft for an explicit save.
  const current = await options.readCurrent();
  options.onReconciled(current);
  try {
    return await replaceAvatar({
      ...options,
      previousPath: current.path,
      update: (path) => options.update(path, current.path),
    });
  } catch (error) {
    // A conflict or lost response may have changed the active source. Read it
    // authoritatively; ambiguous uploads remain untouched even after this read.
    try {
      options.onReconciled(await options.readCurrent());
    } catch {
      // Preserve the original error. The next explicit save must read again.
    }
    throw error;
  }
}

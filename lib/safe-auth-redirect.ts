const GAME_DETAIL_PATH_PATTERN =
  /^\/dashboard\/games\/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export function getSafeAuthRedirectPath(value: unknown) {
  if (value === "/dashboard") {
    return value;
  }

  if (typeof value !== "string" || !GAME_DETAIL_PATH_PATTERN.test(value)) {
    return null;
  }

  return value;
}

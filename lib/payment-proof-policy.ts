export const paymentProofRequestCooldownMs = 12 * 60 * 60 * 1000;

export function getPaymentProofRequestAvailableAt(
  requestedAt: string | null | undefined,
) {
  if (!requestedAt) {
    return null;
  }

  const requestedAtMs = Date.parse(requestedAt);

  return Number.isNaN(requestedAtMs)
    ? null
    : requestedAtMs + paymentProofRequestCooldownMs;
}

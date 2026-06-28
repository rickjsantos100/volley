import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export const paymentProofBucket = "payment-proofs";
export const maxPaymentProofBytes = 5 * 1024 * 1024;
export const paymentProofMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function getPaymentProofPath(gameId: string, userId: string) {
  return `${gameId}/${userId}/proof`;
}

export async function removePaymentProofs(paths: string[]) {
  const uniquePaths = [...new Set(paths.filter(Boolean))];

  if (uniquePaths.length === 0) {
    return;
  }

  const supabase = createAdminClient();
  const { error } = await supabase.storage
    .from(paymentProofBucket)
    .remove(uniquePaths);

  if (error) {
    throw error;
  }
}

export async function getGamePaymentProofPaths(gameIds: string[]) {
  if (gameIds.length === 0) {
    return [];
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("game_participants")
    .select("game_event_id, user_id")
    .in("game_event_id", gameIds)
    .returns<Array<{ game_event_id: string; user_id: string }>>();

  if (error) {
    throw error;
  }

  return (data ?? []).map((participant) =>
    getPaymentProofPath(participant.game_event_id, participant.user_id),
  );
}

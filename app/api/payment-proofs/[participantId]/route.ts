import { redirect } from "next/navigation";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth/server";
import { paymentProofBucket } from "@/lib/payment-proofs";
import { createAdminClient } from "@/lib/supabase/admin";

type ParticipantProofRow = {
  proof_path: string | null;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ participantId: string }> },
) {
  const [{ participantId }, profile, user] = await Promise.all([
    params,
    getCurrentProfile(),
    getCurrentUser(),
  ]);

  if (!user || profile?.role !== "admin") {
    return new Response("Not found", { status: 404 });
  }

  const supabase = createAdminClient();
  const { data: participant, error } = await supabase
    .from("game_payment_proofs")
    .select("proof_path")
    .eq("participant_id", participantId)
    .maybeSingle<ParticipantProofRow>();

  if (error || !participant?.proof_path) {
    return new Response("Not found", { status: 404 });
  }

  const { data, error: signedUrlError } = await supabase.storage
    .from(paymentProofBucket)
    .createSignedUrl(participant.proof_path, 60);

  if (signedUrlError || !data.signedUrl) {
    return new Response("Proof unavailable", { status: 404 });
  }

  redirect(data.signedUrl);
}

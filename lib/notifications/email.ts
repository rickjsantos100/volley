import "server-only";

import { createHash } from "node:crypto";
import { Resend } from "resend";
import { adminAddedToGameTemplate } from "@/lib/notifications/templates/admin-added-to-game";
import { gameUpdatedTemplate } from "@/lib/notifications/templates/game-updated";
import { paymentProofRequestTemplate } from "@/lib/notifications/templates/payment-proof-request";

const sender = "Voley Lisboa <noreply@voleylisboa.pt>";

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  return new Resend(apiKey);
}

function getApplicationUrl() {
  const applicationUrl = process.env.APP_URL;

  if (!applicationUrl) {
    throw new Error("APP_URL is not configured.");
  }

  return applicationUrl.replace(/\/+$/, "");
}

export async function sendAdminAddedToGameEmail({
  email,
  gameId,
  participantId,
  startsAt,
}: {
  email: string;
  gameId: string;
  participantId: string;
  startsAt: string;
}) {
  const gameDate = new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  }).format(new Date(startsAt));
  const gameUrl = `${getApplicationUrl()}/dashboard/games/${gameId}`;
  const template = adminAddedToGameTemplate({ gameDate, gameUrl });
  const templateFingerprint = createHash("sha256")
    .update(`${template.subject}\n${template.text}\n${template.html}`)
    .digest("hex")
    .slice(0, 16);
  const resend = getResendClient();
  const { error } = await resend.emails.send(
    {
      from: sender,
      html: template.html,
      to: [email],
      subject: template.subject,
      text: template.text,
    },
    {
      idempotencyKey: `admin-added-to-game/${participantId}/${templateFingerprint}`,
    },
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function sendGameUpdatedEmail({
  email,
  gameId,
  participantId,
  startsAt,
}: {
  email: string;
  gameId: string;
  participantId: string;
  startsAt: string;
}) {
  const gameDate = new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  }).format(new Date(startsAt));
  const gameUrl = `${getApplicationUrl()}/dashboard/games/${gameId}`;
  const template = gameUpdatedTemplate({ gameDate, gameUrl });
  const templateFingerprint = createHash("sha256")
    .update(`${template.subject}\n${template.text}\n${template.html}`)
    .digest("hex")
    .slice(0, 16);
  const resend = getResendClient();
  const { error } = await resend.emails.send(
    {
      from: sender,
      html: template.html,
      to: [email],
      subject: template.subject,
      text: template.text,
    },
    {
      idempotencyKey: `game-updated/${participantId}/${templateFingerprint}`,
    },
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function sendPaymentProofRequestEmail({
  email,
  gameId,
  participantId,
  requestVersion,
  startsAt,
}: {
  email: string;
  gameId: string;
  participantId: string;
  requestVersion: string;
  startsAt: string;
}) {
  const gameDate = new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  }).format(new Date(startsAt));
  const gameUrl = `${getApplicationUrl()}/dashboard/games/${gameId}`;
  const template = paymentProofRequestTemplate({ gameDate, gameUrl });
  const templateFingerprint = createHash("sha256")
    .update(`${template.subject}\n${template.text}\n${template.html}`)
    .digest("hex")
    .slice(0, 16);
  const requestFingerprint = createHash("sha256")
    .update(requestVersion)
    .digest("hex")
    .slice(0, 16);
  const resend = getResendClient();
  const { error } = await resend.emails.send(
    {
      from: sender,
      html: template.html,
      to: [email],
      subject: template.subject,
      text: template.text,
    },
    {
      idempotencyKey: `payment-proof-request/${participantId}/${requestFingerprint}/${templateFingerprint}`,
    },
  );

  if (error) {
    throw new Error(error.message);
  }
}

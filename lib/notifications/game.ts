import "server-only";

import {
  sendGameNotificationEmail,
  type DeliveryOutcome,
} from "@/lib/notifications/email";
import {
  enqueueNotification,
  processPendingNotifications,
  type PushNotificationKind,
  type PushPayload,
} from "@/lib/notifications/push";
import type { GameEmailKind } from "@/lib/notifications/templates/game-notification";

export type GameNotificationKind = PushNotificationKind & GameEmailKind;

export type GameNotificationRecipient = {
  participantId: string;
  userId: string;
};

type ChannelSummary = Record<DeliveryOutcome, number>;

export type NotificationDeliverySummary = {
  email: ChannelSummary;
  push: ChannelSummary;
  hasFailures: boolean;
};

const pushPayloads: Record<
  GameNotificationKind,
  Omit<PushPayload, "tag" | "url">
> = {
  admin_added_to_game: {
    body: "Um organizador adicionou-te ao jogo. Vê os detalhes e adiciona o comprovativo.",
    title: "Estás dentro",
  },
  game_cancelled: {
    body: "Este jogo já não vai avançar. Vê os próximos jogos no painel.",
    title: "Jogo cancelado",
  },
  game_deleted: {
    body: "Um jogo em que estavas inscrito foi apagado.",
    title: "Jogo apagado",
  },
  game_reminder_4h: {
    body: "O jogo começa dentro de 4 horas. Confirma se continuas dentro.",
    title: "Ainda vens jogar?",
  },
  game_uncancelled: {
    body: "Este jogo voltou ao calendário. Vê os detalhes.",
    title: "Jogo de volta",
  },
  game_updated: {
    body: "Um jogo em que estás inscrito foi alterado. Vê as novas informações.",
    title: "Jogo atualizado",
  },
  payment_proof_requested: {
    body: "Adiciona o comprovativo de pagamento na página do jogo.",
    title: "Comprovativo em falta",
  },
  waitlist_promoted: {
    body: "Saíste da lista de espera. Adiciona agora o comprovativo de pagamento.",
    title: "Tens vaga no jogo",
  },
};

function emptySummary(): ChannelSummary {
  return { failed: 0, sent: 0, skipped: 0 };
}

export async function dispatchGameNotification({
  deliveryVersion,
  gameId,
  kind,
  recipients,
  startsAt,
}: {
  deliveryVersion: string;
  gameId: string;
  kind: GameNotificationKind;
  recipients: GameNotificationRecipient[];
  startsAt: string;
}): Promise<NotificationDeliverySummary> {
  const email = emptySummary();
  const push = emptySummary();
  const uniqueRecipients = [
    ...new Map(recipients.map((recipient) => [recipient.userId, recipient])).values(),
  ];

  const emailWork = Promise.allSettled(
    uniqueRecipients.map(async (recipient) => {
      const outcome = await sendGameNotificationEmail({
        deliveryKey: `${kind}/${gameId}/${recipient.userId}/${deliveryVersion}`,
        gameId,
        kind,
        startsAt,
        userId: recipient.userId,
      });
      email[outcome] += 1;
    }),
  ).then((results) => {
    email.failed += results.filter((result) => result.status === "rejected").length;
  });

  const pushWork = Promise.allSettled(
    uniqueRecipients.map((recipient) =>
      enqueueNotification({
        dedupeKey: `${kind}:${gameId}:${recipient.userId}:${deliveryVersion}`,
        gameEventId: kind === "game_deleted" ? undefined : gameId,
        kind,
        payload: {
          ...pushPayloads[kind],
          tag: `${kind.replaceAll("_", "-")}-${gameId}`,
          url:
            kind === "game_cancelled" || kind === "game_deleted"
              ? "/dashboard"
              : `/dashboard/games/${gameId}`,
        },
        userId: recipient.userId,
      }),
    ),
  ).then(async (results) => {
    const ids: string[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        ids.push(result.value);
      } else {
        push.failed += 1;
      }
    }
    if (ids.length > 0) {
      const processed = await processPendingNotifications(ids.length, ids);
      push.failed += processed.failed;
      push.sent += processed.sent;
      push.skipped += processed.skipped;
    }
  });

  const channelResults = await Promise.allSettled([emailWork, pushWork]);
  if (channelResults[0].status === "rejected") {
    email.failed += 1;
  }
  if (channelResults[1].status === "rejected") {
    push.failed += 1;
  }

  return {
    email,
    push,
    hasFailures: email.failed > 0 || push.failed > 0,
  };
}

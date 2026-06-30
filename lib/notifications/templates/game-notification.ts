export type GameEmailKind =
  | "admin_added_to_game"
  | "game_cancelled"
  | "game_deleted"
  | "game_reminder_4h"
  | "game_uncancelled"
  | "game_updated"
  | "payment_proof_requested"
  | "waitlist_promoted";

const copy: Record<
  GameEmailKind,
  { action: string; heading: string; intro: string; subject: string }
> = {
  admin_added_to_game: {
    action: "Ver jogo",
    heading: "Estás dentro",
    intro: "Um organizador adicionou-te a este jogo.",
    subject: "Foste adicionado a um jogo",
  },
  game_cancelled: {
    action: "Ver próximos jogos",
    heading: "Jogo cancelado",
    intro: "Este jogo já não vai avançar.",
    subject: "Jogo cancelado",
  },
  game_deleted: {
    action: "Ver próximos jogos",
    heading: "Jogo apagado",
    intro: "Um jogo em que estavas inscrito foi apagado.",
    subject: "Jogo apagado",
  },
  game_reminder_4h: {
    action: "Ver jogo",
    heading: "Ainda vens jogar?",
    intro: "O jogo começa dentro de cerca de 4 horas.",
    subject: "O jogo começa dentro de 4 horas",
  },
  game_uncancelled: {
    action: "Ver jogo",
    heading: "Jogo de volta",
    intro: "Este jogo voltou ao calendário.",
    subject: "Jogo novamente ativo",
  },
  game_updated: {
    action: "Ver jogo",
    heading: "Jogo atualizado",
    intro: "Um organizador alterou este jogo. Vê as novas informações.",
    subject: "Jogo atualizado",
  },
  payment_proof_requested: {
    action: "Adicionar comprovativo",
    heading: "Comprovativo em falta",
    intro: "Precisamos do teu comprovativo de pagamento para este jogo.",
    subject: "Comprovativo de pagamento em falta",
  },
  waitlist_promoted: {
    action: "Adicionar comprovativo",
    heading: "Tens vaga no jogo",
    intro:
      "Saíste da lista de espera e estás dentro. Adiciona agora o comprovativo de pagamento.",
    subject: "Tens vaga no jogo",
  },
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function gameNotificationTemplate({
  gameDate,
  kind,
  url,
}: {
  gameDate: string;
  kind: GameEmailKind;
  url: string;
}) {
  const content = copy[kind];
  const safeDate = escapeHtml(gameDate);
  const safeUrl = escapeHtml(url);
  const text = [
    content.heading.toLocaleUpperCase("pt-PT"),
    "",
    content.intro,
    "",
    `Jogo: ${gameDate}`,
    "",
    `${content.action}: ${url}`,
    "",
    "Voley Lisboa",
  ].join("\n");

  return {
    subject: content.subject,
    text,
    html: `<!doctype html>
<html lang="pt">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(content.subject)}</title></head>
  <body style="margin:0;padding:0;background:#f5f7fa;color:#101828;font-family:Inter,Helvetica Neue,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;background:#f5f7fa;">
      <tr><td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:520px;border:1px solid #dde2ea;border-collapse:collapse;background:#ffffff;">
          <tr><td style="border-top:4px solid #ffd21a;background:#061b6b;padding:28px;">
            <p style="margin:0 0 8px;color:#ffd21a;font-size:13px;font-weight:700;line-height:20px;text-transform:uppercase;letter-spacing:.08em;">Voley Lisboa</p>
            <h1 style="margin:0;color:#ffffff;font-family:Arial Narrow,Arial,sans-serif;font-size:34px;font-weight:700;line-height:36px;">${escapeHtml(content.heading)}</h1>
          </td></tr>
          <tr><td style="padding:28px;">
            <p style="margin:0 0 20px;font-size:16px;line-height:24px;">${escapeHtml(content.intro)}</p>
            <p style="margin:0;padding:18px 20px;border:1px solid #ffd21a;background:#fff8d6;color:#061b6b;font-size:22px;font-weight:700;line-height:30px;">${safeDate}</p>
            <p style="margin:24px 0;"><a href="${safeUrl}" style="display:inline-block;border-radius:10px;background:#ffd21a;padding:13px 20px;color:#061b6b;font-size:14px;font-weight:700;text-decoration:none;">${escapeHtml(content.action)}</a></p>
            <p style="margin:0;color:#667085;font-size:12px;line-height:18px;">Se o botão não funcionar, copia esta ligação:<br><a href="${safeUrl}" style="color:#0737a8;word-break:break-all;">${safeUrl}</a></p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`,
  };
}

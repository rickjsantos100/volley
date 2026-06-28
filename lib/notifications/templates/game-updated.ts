type GameUpdatedTemplateProps = {
  gameDate: string;
  gameUrl: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function gameUpdatedTemplate({
  gameDate,
  gameUrl,
}: GameUpdatedTemplateProps) {
  const safeGameDate = escapeHtml(gameDate);
  const safeGameUrl = escapeHtml(gameUrl);

  return {
    subject: "Jogo atualizado",
    text: [
      "JOGO ATUALIZADO",
      "",
      `Um organizador alterou este jogo de ${gameDate}. Vê as novas informações.`,
      "",
      `Vê os detalhes do jogo: ${gameUrl}`,
      "",
      "Até já no campo.",
      "",
      "Voley Lisboa",
    ].join("\n"),
    html: `<!doctype html>
<html lang="pt">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Jogo atualizado</title>
  </head>
  <body style="margin:0;padding:0;background:#f5f7fa;color:#101828;font-family:Inter,Helvetica Neue,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      Um organizador alterou um jogo do Voley Lisboa.
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;background:#f5f7fa;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:520px;border:1px solid #dde2ea;border-collapse:collapse;background:#ffffff;">
            <tr>
              <td style="border-top:4px solid #ffd21a;background:#061b6b;padding:28px;">
                <p style="margin:0 0 8px;color:#ffd21a;font-size:13px;font-weight:700;line-height:20px;text-transform:uppercase;letter-spacing:0.08em;">
                  Voley Lisboa
                </p>
                <h1 style="margin:0;color:#ffffff;font-family:Arial Narrow,Arial,sans-serif;font-size:34px;font-weight:700;line-height:36px;">
                  Jogo atualizado
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 20px;color:#101828;font-size:16px;line-height:24px;">
                  Um organizador alterou este jogo. Vê as novas informações.
                </p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border:1px solid #ffd21a;border-collapse:collapse;background:#fff8d6;">
                  <tr>
                    <td style="padding:18px 20px;">
                      <p style="margin:0 0 4px;color:#667085;font-size:12px;font-weight:700;line-height:18px;text-transform:uppercase;letter-spacing:0.08em;">
                        Jogo atualizado
                      </p>
                      <p style="margin:0;color:#061b6b;font-family:Arial Narrow,Arial,sans-serif;font-size:24px;font-weight:700;line-height:30px;">
                        ${safeGameDate}
                      </p>
                    </td>
                  </tr>
                </table>
                <table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:24px 0;">
                  <tr>
                    <td style="border-radius:10px;background:#ffd21a;">
                      <a href="${safeGameUrl}" style="display:inline-block;padding:13px 20px;color:#061b6b;font-size:14px;font-weight:700;line-height:20px;text-decoration:none;">
                        Ver jogo
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 16px;color:#667085;font-size:14px;line-height:22px;">
                  Até já no campo.
                </p>
                <p style="margin:0;color:#667085;font-size:12px;line-height:18px;">
                  Se o botão não funcionar, copia esta ligação:<br />
                  <a href="${safeGameUrl}" style="color:#0737a8;word-break:break-all;">${safeGameUrl}</a>
                </p>
                <p style="margin:24px 0 0;padding-top:18px;border-top:1px solid #dde2ea;color:#667085;font-size:12px;line-height:18px;">
                  Esta mensagem foi enviada porque um jogo em que estás inscrito foi alterado.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  };
}
import assert from "node:assert/strict";
import test from "node:test";
import { gameNotificationTemplate } from "./game-notification.ts";

test("admin waitlist email is explicit and never requests payment", () => {
  const result = gameNotificationTemplate({
    gameDate: "16 outubro, 19:00",
    kind: "admin_added_to_waitlist",
    url: "https://example.test/dashboard/games/game-id",
  });
  for (const content of [result.subject, result.text, result.html]) {
    assert.match(content, /lista de espera/i);
    assert.doesNotMatch(content, /pagamento|comprovativo|estás dentro/i);
  }
  assert.match(result.text, /Avisamos-te se houver vaga/);
  assert.match(result.text, /Ver jogo: https:\/\/example.test\/dashboard\/games\/game-id/);
});

test("admin roster email retains confirmed participation copy", () => {
  const result = gameNotificationTemplate({
    gameDate: "16 outubro, 19:00",
    kind: "admin_added_to_game",
    url: "https://example.test/game",
  });
  assert.match(result.text, /ESTÁS DENTRO/);
  assert.doesNotMatch(result.text, /lista de espera/i);
});

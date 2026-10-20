// Local Docker only. Requires an isolated container with this branch's migrations.
// node supabase/tests/admin_add_game_player_concurrency.mjs CONTAINER_NAME
// The container MUST have label volley.admin-add-regression=true. No URL/password
// input is accepted, and neither connection settings nor SQL errors are logged.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const container = process.argv[2];
if (!container || !/^[a-zA-Z0-9_-]+$/.test(container)) {
  throw new Error("Pass the name of a labeled isolated local Docker container.");
}
// Refuse a remote Docker daemon, even if its container has the expected label.
const context = execFileSync("docker", ["context", "show"], { encoding: "utf8" }).trim();
const endpoint = JSON.parse(execFileSync("docker", ["context", "inspect", context], {
  encoding: "utf8",
}))[0].Endpoints.docker.Host;
if (process.env.DOCKER_HOST || process.env.DOCKER_CONTEXT || !endpoint.startsWith("unix://")) {
  throw new Error("Only an unoverridden local Unix-socket Docker context is supported.");
}
const label = execFileSync("docker", ["inspect", "--format",
  '{{index .Config.Labels "volley.admin-add-regression"}}', container], { encoding: "utf8" }).trim();
if (label !== "true") throw new Error("Refusing container without isolation label.");

function connection() {
  const child = spawn("docker", ["exec", "-i", container, "psql", "-X", "-U",
    "supabase_admin", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atq"], {
    stdio: ["pipe", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const timer = setTimeout(() => child.kill(), 20000);
  const done = new Promise((resolve, reject) => {
    child.once("error", () => reject(new Error("Could not launch local psql.")));
    child.once("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
  return { child, done, output: () => stdout };
}
async function sql(statement) {
  const session = connection();
  session.child.stdin.end(`set statement_timeout = '15s';\n${statement}\n`);
  const result = await session.done;
  assert.equal(result.code, 0, "Local fixture/query failed (SQL output suppressed).");
  return result.stdout.trim();
}
async function until(check) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (await check()) return;
    await delay(50);
  }
  throw new Error("Timed out waiting for concurrent sessions to block on the game lock.");
}

const admin = randomUUID();
const players = Array.from({ length: 6 }, () => randomUUID());
const games = Array.from({ length: 3 }, () => randomUUID());
const allUsers = [admin, ...players];
const ids = (values) => values.map((id) => `'${id}'`).join(",");
const call = (game, user) => `select destination || '|' ||
  coalesce(participant_id::text, '') || '|' || coalesce(waitlist_entry_id::text, '')
  from public.admin_add_game_player('${game}', '${user}');`;
const authenticate = `set local role authenticated;
  set local request.jwt.claim.sub = '${admin}';`;

async function race(game, users) {
  const blocker = connection();
  const workers = [];
  try {
    blocker.child.stdin.write(`begin; set local statement_timeout = '15s';
      set local idle_in_transaction_session_timeout = '15s';
      select id from public.game_events where id = '${game}' for update;
      select 'lock-ready';\n`);
    await until(() => blocker.output().includes("lock-ready"));
    const names = users.map(() => `admin_add_${randomUUID().replaceAll("-", "")}`);
    for (let i = 0; i < users.length; i++) {
      const worker = connection();
      worker.child.stdin.end(`begin; set local statement_timeout = '15s';
        set local application_name = '${names[i]}';
        ${authenticate} ${call(game, users[i])} commit;\n`);
      workers.push(worker);
    }
    // Prove both sessions are waiting simultaneously before releasing the lock.
    await until(async () => await sql(`select count(*) from pg_stat_activity
      where application_name in (${ids(names)}) and wait_event_type = 'Lock';`) === String(users.length));
    blocker.child.stdin.end("commit;\n");
    assert.equal((await blocker.done).code, 0, "Lock-holder transaction failed.");
    return await Promise.all(workers.map((worker) => worker.done));
  } finally {
    // Roll back held locks and stop pending workers on assertion/timeout failures.
    if (!blocker.child.stdin.writableEnded) blocker.child.stdin.end("rollback;\n");
    await blocker.done;
    await Promise.all(workers.map((worker) => worker.done));
  }
}

try {
  await sql(`insert into auth.users (id, email, raw_user_meta_data) values
    ${allUsers.map((id) => `('${id}', '${id}@example.test', '{"display_name":"Concurrency regression"}'::jsonb)`).join(",")};
    update public.profiles set role = 'admin' where id = '${admin}';
    insert into public.game_events (id, title, starts_at, duration_minutes, max_participants)
    values ${games.map((id) => `('${id}', 'Admin add concurrency regression', now() + interval '7 days', 90, 1)`).join(",")};`);

  const lastSlot = await race(games[0], players.slice(0, 2));
  assert.ok(lastSlot.every((result) => result.code === 0), "Both last-slot calls succeed.");
  assert.deepEqual(lastSlot.map((result) => result.stdout.trim().split("|")[0]).sort(),
    ["participant", "waitlist"]);
  assert.equal(await sql(`select (select count(*) from public.game_participants where game_event_id = '${games[0]}')
    || '|' || (select count(*) from public.game_waitlist_entries where game_event_id = '${games[0]}' and status = 'active');`), "1|1");
  console.log("PASS different users / last slot: one roster, one waitlist");

  const duplicate = await race(games[1], [players[2], players[2]]);
  assert.equal(duplicate.filter((result) => result.code === 0).length, 1);
  const rejected = duplicate.find((result) => result.code !== 0);
  assert.match(rejected.stderr, /Player is already in this game or on its waitlist/);
  assert.equal(await sql(`select (select count(*) from public.game_participants where game_event_id = '${games[1]}')
    || '|' || (select count(*) from public.game_waitlist_entries where game_event_id = '${games[1]}');`), "1|0");
  console.log("PASS same user: one success, one duplicate rejection");

  await sql(`begin; ${authenticate} ${call(games[2], admin)} ${call(games[2], players[3])} commit;`);
  const full = await race(games[2], players.slice(4, 6));
  assert.ok(full.every((result) => result.code === 0));
  assert.ok(full.every((result) => result.stdout.trim().startsWith("waitlist||")));
  assert.equal(await sql(`select string_agg(waitlist_order::text, ',' order by waitlist_order)
    from public.game_waitlist_entries where game_event_id = '${games[2]}' and status = 'active';`), "1,2,3");
  console.log("PASS full game: unique appended active waitlist orders 1,2,3");
} finally {
  // Only this invocation's UUID fixtures are removed; never truncate/reset.
  await sql(`delete from public.game_events where id in (${ids(games)});
    delete from auth.users where id in (${ids(allUsers)});`);
  console.log("Fixture cleanup complete");
}

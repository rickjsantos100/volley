// Local only. Uses libpq's password environment/.pgpass; accepts no remote URL.
// PGPASSWORD=<local password> node supabase/tests/series_schedule_concurrency.mjs
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

function connection() {
  const env = { ...process.env };
  // PGHOSTADDR overrides -h for the actual connection destination in libpq.
  for (const key of ["PGSERVICE", "PGSERVICEFILE", "PGOPTIONS", "PGHOSTADDR"]) delete env[key];
  const child = spawn("psql", ["-X", "-h", "127.0.0.1", "-p", "54322", "-U",
    "postgres", "-d", "postgres", "-Atq", "-v", "ON_ERROR_STOP=1"], {
    env,
    stdio: ["pipe", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", () => {});
  const timer = setTimeout(() => child.kill(), 20000);
  const done = new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code) => { clearTimeout(timer); resolve(code); });
  });
  child.stdin.write("set statement_timeout='15s'; set idle_in_transaction_session_timeout='15s';\n");
  return { child, done, output: () => output };
}
async function sql(text) {
  const session = connection();
  session.child.stdin.end(text + "\n");
  assert.equal(await session.done, 0, "local SQL failed");
  return session.output().trim();
}
async function until(check) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (await check()) return;
    await delay(30);
  }
  throw new Error("Timed out waiting for concurrent advisory lock waiters");
}
const admin = randomUUID();
const series = [randomUUID(), randomUUID()];
const names = series.map((id) => `series_test_${id}`);
const ids = series.map((id) => `'${id}'`).join(",");
const blocker = connection();
const workers = [];
try {
  await sql(`insert into auth.users(id,email,raw_user_meta_data)
    values ('${admin}','${admin}@example.test','{}');
    update public.profiles set role='admin' where id='${admin}';`);
  blocker.child.stdin.write("begin; select pg_advisory_xact_lock(1987012141,1); select 'ready';\n");
  await until(() => blocker.output().includes("ready"));
  for (let i = 0; i < 2; i++) {
    const worker = connection();
    workers.push(worker);
    worker.child.stdin.end(`begin; set local application_name='${names[i]}';
      set local role authenticated; set local request.jwt.claim.sub='${admin}';
      insert into public.recurring_game_series(title,starts_at,duration_minutes,max_participants,created_by)
      values ('${series[i]}', date_trunc('minute',now())+interval '2 days',60,12,'${admin}');
      commit;\n`);
  }
  // Both INSERTs already hold compatible relation locks. Neither may mutate
  // until it owns the serialization lock; no AFTER-trigger lock upgrades.
  await until(async () => await sql(`select count(*) from pg_stat_activity
    where application_name in ('${names[0]}','${names[1]}')
    and wait_event='advisory';`) === "2");
  blocker.child.stdin.end("commit;\n");
  assert.equal(await blocker.done, 0);
  for (const worker of workers) assert.equal(await worker.done, 0, "both series inserts must commit");
  assert.equal(await sql(`select count(*) from public.recurring_game_series where title in (${ids});`), "2");
  assert.equal(await sql(`select count(*) from (
    select e.recurring_series_id,e.recurring_starts_at from public.game_events e
    join public.recurring_game_series s on s.id=e.recurring_series_id
    where s.title in (${ids}) group by 1,2 having count(*)>1) duplicates;`), "0");
  assert.equal(await sql(`select count(distinct e.recurring_series_id) from public.game_events e
    join public.recurring_game_series s on s.id=e.recurring_series_id where s.title in (${ids});`), "2");
  console.log("PASS: two simultaneous authenticated series inserts commit, both generate, no duplicates");
} finally {
  if (!blocker.child.stdin.writableEnded) blocker.child.stdin.end("rollback;\n");
  await blocker.done;
  await Promise.all(workers.map((worker) => worker.done));
  await sql(`begin;
    delete from public.game_events where recurring_series_id in
      (select id from public.recurring_game_series where title in (${ids}));
    delete from public.recurring_game_series where title in (${ids});
    delete from auth.users where id='${admin}'; commit;`);
}

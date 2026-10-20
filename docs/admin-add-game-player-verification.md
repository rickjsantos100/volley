# Admin Add player routing

The existing admin Add player control remains available when a scheduled future
game is full. The database chooses roster or active waitlist, not the browser.
List/profile load failures disable the selector rather than suggesting players
whose existing membership is unknown. Both destinations close the selector and
show distinct English/European Portuguese feedback, including the destination
when notification delivery fails.

## Security and transaction boundary

`public.admin_add_game_player` is a security-invoker wrapper. Its private definer
helper requires an authenticated admin even when invoked directly; only
`authenticated` has execute permission. Both functions fix `search_path` to empty
and qualify object references. No table grants or RLS policies are broadened.

The helper locks the eligible game row before reading capacity, checking either
membership table, or inserting. Existing insertion guards use the same game
lock. The waitlist guard appends after the largest active ordering value.
Participant rows retain the admin actor and admin-added source (including an
admin selecting themselves). The result identifies the destination and the
inserted row; notifications use that row ID for retry deduplication. The new
waitlist notification does not request payment or claim a confirmed place.

The only database notification kind constraint is on the push outbox; email
delivery goes directly through Resend and has no database kind constraint. The
migration adds the new kind without restoring legacy test/payment kinds.

## Focused checks

```sh
npm ci
npm run lint
npx tsc --noEmit
node --test lib/notifications/templates/game-notification.test.mjs
docker start volley_admin_add_regression
docker exec -i volley_admin_add_regression psql -X -U supabase_admin -d postgres \
  -v ON_ERROR_STOP=1 -At < supabase/tests/admin_add_game_player_test.sql
node supabase/tests/admin_add_game_player_concurrency.mjs volley_admin_add_regression
git diff --check
```

The SQL regression is transactional pgTAP coverage for permission boundaries,
both capacity branches, duplicate membership, game/player eligibility, ordering,
actor/source metadata, and returned IDs. All 26 assertions passed locally. Its
fixtures and extension installation roll back at the end. Check pgTAP output for
`not ok` as well as the process exit status when running through plain psql.

## Isolation and migration verification

The existing `supabase_db_volley` container was started with approval, without
resetting or changing its app schema/data. Its migration history contains changes
through `20260918120000`, beyond this branch's `20260828120000` baseline. Testing
an upgrade on that database would not establish compatibility with this branch.

Instead, a separate container `volley_admin_add_regression` was initialized from
`public.ecr.aws/supabase/postgres:17.6.1.136`, with no published ports or shared
volumes and label `volley.admin-add-regression=true`. Cron was preloaded but job
execution disabled (`cron.launch_active_jobs=off`); no application secrets or
data were copied. Supabase Auth/Storage infrastructure schemas were imported
schema-only from the local database, omitting **all** triggers and policies so
later application changes were not carried over. No public/private app schemas
or migration history were imported. Infrastructure schemas are consequently the
local stack's versions, not a reconstruction of their historical June versions.

All 39 repository migrations, in filename order, then applied successfully to
the empty application baseline with `psql -v ON_ERROR_STOP=1`, including
`20261016120000_admin_add_game_player.sql`. Application triggers/policies were
created by these unmodified migrations. No migration was skipped or marked
applied without executing it. Migration replay used the isolated container's
`supabase_admin` role; permission assertions explicitly switch to authenticated
roles and check anonymous grants.

To replay migrations on a newly prepared empty isolated baseline:

```sh
for file in supabase/migrations/*.sql; do
  docker exec -i volley_admin_add_regression psql -X -U supabase_admin -d postgres \
    -v ON_ERROR_STOP=1 -q < "$file" || break
done
```

Do **not** run that loop again on an already migrated database. Never reset the
original repository's local database to run these checks.

## Concurrency harness

The runnable Node harness accepts only a Docker container name, requires the
isolation label above, and rejects remote/overridden Docker contexts. It accepts
no database URL or password and does not log SQL connection/error contents.
It opens a game-row lock-holder plus two authenticated-admin worker connections,
checks `pg_stat_activity` until both workers are simultaneously blocked on locks,
then releases the lock. It verifies:

- Different users competing for the last slot: one roster and one active waitlist
  insertion, both calls successful.
- Same selected user: exactly one success and one duplicate rejection, with no
  opposite-table membership.
- An already full game: both calls append to the active waitlist, preserving the
  existing first entry and producing unique orders `1,2,3`.

All three scenarios passed in three consecutive runs. Post-run queries confirmed
zero remaining harness games/users. Fixtures have fresh UUIDs and are deleted in `finally`
without truncating tables or disabling guards; the harness can be rerun. Query,
lock-holder, and polling timeouts bound failures. No hosted database changes,
deployment, or dev-server restart occurred. Hosted migration publication remains
pending explicit approval.

The primary agent independently reran all 26 SQL assertions and all three
concurrency scenarios successfully. The dev server remains stopped. Both local
database containers started for verification were stopped afterward; restart the
isolated regression container before rerunning the commands above.

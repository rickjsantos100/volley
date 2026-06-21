# Volleyball Game Management - Technical Requirements

## 1. Purpose

Define the technical approach for building and deploying the volleyball game management application.

This document complements `docs/software-requirements.md`, which defines the product behavior.

## 2. Recommended Stack

The initial version should use a simple, managed stack that is easy to develop, deploy, and maintain.

- Application framework: Next.js with TypeScript.
- UI styling: Tailwind CSS.
- UI components: shadcn/ui.
- Backend services: Supabase.
- Database: Supabase Postgres.
- Authentication: Supabase Auth.
- Authorization: Supabase Row Level Security policies.
- Hosting: Vercel.
- App capability: Progressive Web App.
- Database deployment: Supabase CLI migrations.
- Supabase client libraries: `@supabase/supabase-js` and `@supabase/ssr`.

## 3. Architecture

The application should be a single Next.js application deployed to Vercel.

The website should function as a Progressive Web App so users can install it on supported devices and launch it like an app.

Supabase should provide:

- User authentication.
- Postgres database.
- Row-level access control.
- Server-side database functions for waitlist promotion.

The application should avoid a separate custom API server for the initial version unless a clear need appears later.

Next.js should use Supabase's server-side auth pattern for the App Router:

- Create browser and server Supabase clients in `lib/supabase`.
- Use `@supabase/ssr` for cookie-based sessions.
- Add a root `proxy.ts` to refresh sessions for server-rendered routes.
- Use `supabase.auth.getClaims()` or `supabase.auth.getUser()` for server-side identity checks.
- Do not rely on `getSession()` user data for authorization decisions.

Login should use Supabase Auth email/password authentication.

Password requirements should stay intentionally light for the initial version:

- Minimum length: 8 characters.
- No required uppercase, number, or symbol rules.

The app should enforce the minimum length before submitting auth requests, and the Supabase Auth provider settings should also be configured with an 8-character minimum password length. Email/password login should not depend on magic links.

Supabase email confirmations should be disabled in the Auth email provider settings. Signup should create a session immediately and redirect the user to the authenticated area without requiring a confirmation email.

## 4. Progressive Web App Requirements

The application should include the core PWA assets and configuration needed for installability:

- Web app manifest with name, short name, icons, theme color, and display mode.
- Mobile-friendly responsive layout.
- Service worker support for caching static application assets.
- Offline fallback behavior for unavailable network requests where practical.

Authentication, game data, waitlist data, and payment status should continue to treat Supabase as the source of truth. Offline support should not allow users to make conflicting game participation or payment-status changes without a successful server round trip.

### 4.1 Opening Shared Links In The Installed App

The manifest should use a stable root identity (`id: "/"`) and keep the full
application in scope (`scope: "/"`). Shared links must use the exact production
HTTPS origin and direct application paths, for example
`/dashboard/games/<game-id>`.

On Android, install the app through Chrome's **Install app** prompt. A Chrome
WebAPK can register in-scope links with Android; a simple home-screen shortcut
cannot. If links continue to open in the browser:

1. Open Android **Settings > Apps > Voley Lisboa > Open by default** and enable
   supported links.
2. Remove and reinstall the PWA after manifest identity or scope changes.
3. Test a production link from WhatsApp, Messages, email, or Notes. Typing the
   URL in the browser is not a link-capture test.

Safari-installed PWAs on iPhone and iPad cannot capture external HTTPS links.
Those links will continue to open in the browser. Reliable iOS link capture
would require publishing a native wrapper and configuring Universal Links;
that work is outside the web PWA scope.

## 5. Supabase Schema Workflow

The project should use Option A: SQL-first migrations.

All database schema and authorization changes should be written as SQL migration files in the source repository before being applied to Supabase.

The repository should include a Supabase directory similar to:

```text
supabase/
  config.toml
  migrations/
    <timestamp>_create_profiles.sql
    <timestamp>_create_game_events.sql
    <timestamp>_create_game_participants.sql
    <timestamp>_create_game_waitlist_entries.sql
  seed.sql
```

This workflow keeps database changes visible, reviewable, reproducible, and version controlled.

Once migrations are in use, remote Supabase schema changes should not be made directly through the hosted Dashboard SQL Editor or Table Editor. Remote dashboard changes bypass migration history and can cause migration sync errors.

If dashboard editing is useful, it should happen against the local Supabase Studio instance only. The resulting changes must be captured as migrations before they are committed.

## 6. Supabase Development Workflow

Initialize Supabase in the repository:

```bash
supabase init
```

Create new migrations with:

```bash
supabase migration new <migration_name>
```

Run the local Supabase stack during development:

```bash
supabase start
```

Reset the local database and apply all migrations:

```bash
supabase db reset
```

Link the local repository to a hosted Supabase project:

```bash
supabase link --project-ref <project-id>
```

Push committed migrations to the hosted Supabase project:

```bash
supabase db push
```

If a hosted Supabase project already has dashboard-created schema changes, pull them into source control before continuing with local migrations:

```bash
supabase db pull
```

This creates a migration representing the current remote schema. The generated migration should be reviewed and committed before adding new schema changes.

## 7. Database Requirements

Database schema should be defined in migrations for:

- User profiles.
- Game events.
- Game participants.
- Game waitlist entries.
- Payment status tracking.
- Admin roles or permissions.

Database migrations should also define:

- Primary keys.
- Foreign keys.
- Unique constraints.
- Required indexes.
- Explicit grants for the `anon`, `authenticated`, and `service_role` Postgres roles where needed by the Data API.
- Row Level Security policies.
- Database functions needed for automatic waitlist promotion.

Every table in the `public` schema must enable Row Level Security explicitly in migrations. Tables created through SQL do not get protected just because the app uses Supabase Auth.

RLS policies should:

- Target explicit roles with `to authenticated` or `to anon` where appropriate.
- Use `(select auth.uid())` rather than bare `auth.uid()` in row policies where possible.
- Explicitly handle unauthenticated access where relevant.
- Include supporting indexes for columns used in policies, such as `user_id`, `game_event_id`, and role lookup columns.
- Include both `using` and `with check` clauses for updates where the new row must also satisfy ownership or role constraints.
- Include a matching `select` policy for rows that users or admins need to update.

## 8. Authorization Requirements

Authorization should be enforced server-side using Supabase Row Level Security.

Required access rules include:

- Authenticated users can view upcoming scheduled games and see cancelled games in the dashboard list.
- Authenticated users can join available games.
- Authenticated users can remove themselves from participant lists.
- Authenticated users can join and leave waitlists.
- Users can see only their own payment status.
- Users cannot see other users' payment status.
- Admins can see and update all participant payment statuses.
- Admins can create, edit, cancel, uncancel, and delete game events.
- Admins can remove users from participant lists.
- Admins can remove users from waitlists.
- Admins can reorder active waitlist entries.

Cancelled game events must remain queryable for the dashboard list while their start time is still in the future. Only admins can open a cancelled game detail page. A cancelled game must not allow participant or waitlist inserts, and the user-facing dashboard UI must render it as disabled with a cancelled badge.

Deleting a game event should remove it from user-facing schedule queries. Existing foreign-key behavior should intentionally decide whether related participant and waitlist rows cascade or are retained elsewhere before deletion is enabled in the UI.

Admin authorization should not depend on user-editable `raw_user_meta_data`.

Admin permissions should be stored in a `profiles` table for the initial version. The `profiles` admin flag must only be editable by trusted admin or server-side code, never by the profile owner directly.

If role-check helper functions are needed for RLS policies, create them in a private, non-exposed schema such as `private`. Security-definer functions must not be created in the `public` schema or any schema exposed through the Supabase Data API.

## 9. Waitlist Automation

Automatic waitlist promotion should be handled server-side.

When a participant leaves or is removed from a full game, the system should promote the first active waitlist entry into the participant list.

The implementation should preserve waitlist order and avoid race conditions when multiple users join, leave, or are promoted around the same time.

Automatic waitlist promotion should be implemented as an explicit Postgres function called by server actions.

The function should run participant removal and waitlist promotion in a single transaction. Direct client-side mutations that bypass this function should be restricted by RLS.

The waitlist promotion implementation should use row locking or another transaction-safe mechanism so two concurrent removals cannot promote the same waitlist entry.

Waitlist ordering should be represented by an explicit, admin-editable ordering value rather than relying only on join timestamps. Automatic promotion must use that ordering value, with a deterministic tie-breaker such as the entry id.

Admin waitlist reorder operations should be handled server-side in a transaction so duplicate or skipped positions cannot be persisted for a single game.

## 10. Admin Game Management Requirements

Admin game management should be implemented through server actions backed by Supabase RLS.

The initial admin game-management slice should include:

- An admin-only create game form.
- Admin-only cancel, uncancel, and delete controls for each game detail page.
- Dashboard rendering for cancelled upcoming games, with game detail rendering restricted to admins.
- Disabled join, leave, and waitlist controls for cancelled games.
- Server-side authorization checks before create, cancel, or delete mutations.

Database support for this slice should include:

- RLS policies allowing only admins to insert, update, and delete `game_events`.
- A `cancelled` status value on `game_events` used for soft cancellation.
- A `deleted` status value on recurring `game_events` used as a tombstone so generated occurrences are not recreated by the recurring-game cron job.
- A scheduled cleanup job that permanently deletes game events whose end time is more than 4 months in the past.
- User-facing select policies that include upcoming `scheduled` and `cancelled` games.
- Insert guards that reject participant and waitlist inserts unless the game status is `scheduled`.
- Tests that prove regular users cannot create, cancel, delete, open, join, or waitlist cancelled games.

## 11. Deployment Requirements

The application should be deployed on Vercel.

Vercel should store application environment variables, including:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

New projects should use Supabase publishable keys instead of legacy anon keys.

Secret Supabase keys must not be exposed to the browser. `NEXT_PUBLIC_` variables are browser-visible and must only contain values that are safe for public clients.

If a server-only administrative Supabase client becomes necessary, it should use a Supabase secret key stored in a server-only environment variable. That client must never be imported into client components or browser-executed code.

Database migrations should be applied manually with the Supabase CLI for early development. Once the project is in active use, migrations should move to CI/CD.

For CI/CD, use encrypted repository secrets for:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_ID`
- `SUPABASE_DB_PASSWORD`

The project should run Supabase CLI commands from CI rather than applying production schema changes manually from local machines once the project is in active use.

## 12. Source Control Requirements

The following should be committed to source control:

- Application source code.
- Supabase migration files.
- Supabase local configuration that is safe to commit.
- Seed data for local development.
- Documentation for any required dashboard-only Supabase configuration.
- Generated TypeScript database types, once generation is set up.
- Database tests for RLS policies and important database functions.

The following should not be committed:

- Supabase access tokens.
- Database passwords.
- Secret keys.
- `.env.local`.
- Production credentials.

## 13. Testing Requirements

Database behavior should be tested locally before migrations are pushed to hosted Supabase.

Required test coverage should include:

- RLS policies for normal users.
- RLS policies for admins.
- Users seeing only their own payment status.
- Users being unable to see other participants' payment status.
- Users joining and leaving participant lists.
- Users joining and leaving waitlists.
- Admin-only game creation, cancellation, uncancellation, and deletion.
- Cancelled games remaining visible in the dashboard but non-openable and non-joinable for regular users.
- Regular users being unable to create, cancel, or delete games.
- Admin waitlist removals and reorder operations.
- Automatic waitlist promotion order.
- Concurrent waitlist promotion edge cases where feasible.

Supabase database tests should use the Supabase CLI test workflow where practical:

```bash
supabase test db
```

The project should also generate TypeScript types from the database schema after migrations are stable:

```bash
supabase gen types typescript --local
```

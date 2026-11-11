# Avatar image optimization and long-term caching

Status: Implemented on the feature branch; automated verification and independent review passed. Local authenticated/browser and Vercel preview verification remain pending. Not deployed.

## Implementation results

- Persisted avatar surfaces now use a shared Next Image component with quality 75 and explicit display sizes. Draft/camera crop previews remain native.
- New uploads use UUID paths, no upsert, and one-year source metadata. Existing stored sources remain unchanged; the optimizer uses a one-year minimum TTL with exact origin/bucket restrictions.
- Replacement reads the authoritative profile pointer, performs a conditional pointer update, and cleans up only safe superseded/orphan files. A synchronous submit guard prevents duplicate submissions; concurrent conflicts and lost responses reconcile for explicit retry without discarding the crop draft.
- Ambiguous update failures deliberately retain potentially active uploads. Failed best-effort cleanup can leave orphan objects; it cannot safely be treated as guaranteed deletion.
- Independently rerun: `npm run test:avatars` (9/9), `npm run test:scheduling` (3/3), `npm run lint`, `npm run build`, and `git diff --check` all passed. Node reports the same module-type warning as the existing scheduling test convention.
- Independent review's stale-pointer retry finding was corrected and rereviewed with no remaining concrete findings.
- Local Supabase verification is blocked by the unavailable Docker daemon; authenticated Storage/RLS and browser scenarios have not been exercised. No production backend was substituted.
- Vercel preview response bytes, cache headers, and warm-cache behavior remain unverified. No deployment, hosted metadata change, or SQL migration was performed.
- Subsequent user smoke test: opened the next three games twice using the local dev server against production Supabase (explicitly requested). Observed 27 original-avatar GETs across 26 objects, 8,770,364 response bytes, all Supabase CDN HIT. The corresponding 27 locally optimized cache files totaled 46,400 bytes. No subsequent original fetches were observed after the initial warming sequence; log ingestion delay and the distinction between local and deployed caches still apply. This does not verify authenticated replacement/upload behavior or Vercel CDN behavior.

## Workspace and baseline

- Worktree: `/Users/ricardo/workspace/volley-avatar-optimization`
- Branch: `feat/avatar-image-optimization`
- Base: freshly fetched `origin/main`, `ffe6ad1`.
- Leave the original `volley` worktree and its uncommitted tournament work untouched.
- Recheck `origin/main` before implementation; integrate new upstream changes without discarding local work.

## Objective

Keep stored avatar source images in Supabase and deliver smaller, optimized variants through Next.js/Vercel Image Optimization. Cache unchanged images long-term, while avatar replacements appear immediately through a new source URL.

The November 2–11 log sample showed 2.18 GB of avatar response bodies (2.15 GB CDN HIT), versus 0.99 MB of payment-proof downloads. Target the measured avatar delivery issue, not documents or unreleased tournament features.

“Original” means the avatar source currently persisted in Supabase: the existing crop workflow exports a 512×512 WebP, capped at 500 KiB. Preserve those sources and the crop workflow. Archiving the raw camera/picked photo, which is not currently stored, is outside scope.

## Current implementation

- `components/profile-form.tsx`: crop/camera previews use object URLs; saving overwrites `<user-id>/avatar.webp` with `upsert: true` and `cacheControl: "3600"`.
- `components/global-header.tsx` and `app/dashboard/games/[gameId]/page.tsx`: independently construct public avatar URLs with `avatar_updated_at` query versioning.
- `components/ui/initials-avatar.tsx`, `components/account-menu.tsx`, and the saved-image section of `components/profile-form.tsx`: display original images with native `<img>`.
- `next.config.ts`: no remote image optimizer configuration.
- Existing Storage policies allow writes inside the authenticated user's folder, so unique filenames should not require a schema migration. Confirm in local tests.

## Implementation sequence

### 1. Establish shared avatar URL and cache rules

- Centralize profile-avatar URL construction, source detection, and display-size conventions in a small cohesive helper/component boundary.
- Keep existing `avatar_path` / `avatar_updated_at` records working without rewriting or downloading their files.
- Preserve timestamp versioning for legacy mutable paths; use immutable paths as the version for new uploads. Do not add render-time/random query strings.
- Support persisted public Storage sources separately from local draft/blob previews. Never send crop previews through the optimizer.

Verification: focused URL tests for missing avatars, existing paths/versions, unique paths, and local versus hosted sources.

### 2. Make new uploads immutable and cacheable

- Save each replacement to `<user-id>/<random-version>.webp`, `upsert: false`, with `cacheControl: "31536000"` (one year).
- Keep existing crop dimensions, compression, file validation, and stored source bytes; do not replace sources with list-sized thumbnails.
- Upload first, update the profile pointer second, and only then clean up the previous source according to the existing replacement behavior. Never delete the active source before the profile update succeeds.
- If the profile update fails, retain the previous profile/source and best-effort remove the orphaned new upload. Test cleanup failures and rapid/double-save behavior so cleanup cannot remove the winning active upload.
- This is not a historical-avatar archive: retain the current source, not necessarily every superseded source.

Verification: mocked upload/update/cleanup ordering, unique paths across replacements, one-year metadata, and failure-path tests; local authenticated Storage policy check.

### 3. Route persisted avatars through Vercel optimization

- Configure the exact project hostname from the Supabase URL and only `/storage/v1/object/public/avatars/**` in `remotePatterns`. Do not allow arbitrary hosts, signed proof URLs, or arbitrary Storage buckets.
- Legacy `?v=` URLs require compatible query handling: omitting `remotePatterns.search` allows queries, so document that tradeoff and keep host/path tightly restricted. New immutable paths need no query version.
- Set explicit quality (initially 75) and a deliberate long optimizer cache TTL (target one year for immutable avatar content). Inspect the effect of the global minimum TTL on other existing Next Image consumers before finalizing configuration.
- Use accurate fixed dimensions / `sizes` for list, header, and larger saved-profile views; allow high-DPI output without requesting the full 512px source for tiny icons. Avoid changing global width breakpoints in ways that regress other images.
- Update all persisted profile-avatar consumers: shared initials avatar, account menu, saved profile image, and their callers. Retain circular cropping, layout stability, accessible alt behavior, and current initials behavior. Do not promise a new broken-image fallback unless implemented and tested.
- Keep draft crop/camera previews native and functional. Default list images should lazy-load; do not preload every avatar.
- Local development must use local Supabase, not production data or credentials. Keep private-IP optimizer access disabled in production; use direct/unoptimized local-only rendering if necessary. This is a development exception, never the production delivery path.

Verification: inspect `/_next/image` URLs, actual requested widths and output formats/bytes, lazy loading, layouts, and avatar replacement across every consumer.

### 4. Validate existing sources and caching behavior

- Existing stored images must benefit from optimization immediately, with no destructive source conversion or mass re-upload.
- The optimizer's configured minimum TTL can extend optimized-cache retention despite old sources retaining their one-hour metadata. Do not mutate hosted legacy metadata merely to ship the rendering change.
- Confirm actual Vercel response headers and repeat-request behavior in an approved preview. Browser-cache policy and Vercel edge retention are distinct; do not assume configuration alone proves a one-year browser hit.
- If legacy source metadata or deployed headers prevent the intended policy, prepare a separate dry-run-first metadata-only maintenance step: preserve bytes and paths, record previous values, and obtain explicit approval before hosted writes. It is not required if the deployed optimizer already provides the desired retention.
- A cold optimized variant still fetches the original once; different sizes/formats/regions or cache eviction can fetch it again. Do not claim zero Supabase egress.

## Verification and acceptance

- Install dependencies with the existing lockfile; keep environment files ignored and do not copy production credentials into tracked files.
- Read `DESIGN.md` and `docs/technical-requirements.md` before application edits; preserve the existing design and crop interactions.
- Use local Supabase for upload/auth/database checks. This main-branch baseline lacks the tournament branch's local-development wrapper; configure ignored local environment values explicitly and do not run tests against hosted data.
- Add focused automated avatar tests using the repo's Node test conventions and an appropriate package script if needed.
- Run `npm run lint`, `npm run build`, `npm run test:scheduling`, and the new focused tests. Record any pre-existing failures separately.
- Browser checks: header, participant/waitlist lists, admin add-player/profile modal, saved profile image, crop/camera preview, no-avatar initials, mobile/desktop and high-DPI displays.
- Replacement check: save two different avatars; verify distinct source URLs, unchanged previous source bytes until cleanup, and new image visible without waiting for cache expiry.
- Compare the optimized response with its original. Target at least an 80% reduction for representative small avatar requests; aim for approximately 10–30 KB where image content permits. Confirm visual quality rather than enforcing a universal byte guarantee.
- In a Vercel preview, verify a cold request, repeated warm requests, cache headers/status, and that repeat requests do not repeatedly fetch the source. Preview uploads must not mutate production; use existing public images for read-only delivery checks or an approved test backend.
- Obtain an independent review of optimizer restrictions, cache-version correctness, and upload failure handling before merging.

## Rollout and monitoring

- No production deployment, hosted metadata writes, database migrations, or changes to Supabase/Vercel plans during planning.
- Implement and review on this branch; merge only after approval. Let the existing GitHub/Vercel integration deploy the main-branch push; do not force a separate deployment.
- Track Vercel Image Optimization transformations/cache reads and transfer; this moves delivery usage to Vercel rather than eliminating it.
- Compare Supabase avatar cached-egress bytes per active user / successful avatar request before and after rollout. Allow for initial optimizer-cache warming and old open clients.
- Roll back rendering/configuration if necessary, but retain unique upload filenames: they remain compatible with direct public URLs.

## Caveats and scope boundaries

- Public avatar copies may remain in browser/Vercel caches after a source is deleted. Long-lived caching is not immediate privacy revocation; deletion/takedown may require a Vercel purge and browser copies cannot be recalled.
- Do not expose payment proofs to public caching, change auth/RLS, add a custom image proxy, implement Supabase paid transformations, or touch tournament code.
- No SQL migration is anticipated. If investigation discovers a need, stop and plan/review that separately before any hosted schema change.

## References

- https://nextjs.org/docs/app/api-reference/components/image
- https://nextjs.org/docs/app/api-reference/config/next-config-js/images
- https://vercel.com/docs/image-optimization
- https://vercel.com/docs/image-optimization/limits-and-pricing
- https://supabase.com/docs/reference/javascript/storage-from-upload

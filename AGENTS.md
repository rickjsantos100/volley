# Agent Instructions

## Project Guidance

Before implementing or changing application code, read and follow:

- `DESIGN.md` for the design rules, visual direction, interaction patterns, and UI constraints for the site.
- `docs/technical-requirements.md` for the technical architecture, stack choices, workflows, and technical decisions.

Treat `docs/technical-requirements.md` as the source of truth for technical decisions. If an implementation detail conflicts with that file, follow the technical requirements unless the user explicitly asks to change them.

Treat `DESIGN.md` as the source of truth for design and user experience decisions. New UI should match those rules unless the user explicitly asks for a different direction.

When technical and design guidance both apply, satisfy both. If they appear to conflict, ask the user before making a change that would violate either document.

## CLI Connections

The Supabase CLI and Vercel CLI are already installed, authenticated, and linked for this repository. Prefer those CLIs for Supabase and Vercel project operations before asking the user to perform dashboard steps manually.

Do not force a Vercel deployment after pushing to `main`. Vercel is connected to the GitHub repository and automatically deploys pushes to `main`.

## Supabase Migration Publishing

When creating a new Supabase migration, also publish/apply that migration to the Supabase project used by the app before considering the task complete.

For hosted Supabase projects, treat applying a migration as a remote schema change: confirm the user wants the migration applied to the hosted project when approval is required, then apply it through the available Supabase tooling and verify the migration appears in the remote migration history.

If publishing is blocked by missing approval, unavailable credentials, Docker/local stack issues, or another external dependency, clearly report the blocker and leave the migration file ready to apply.

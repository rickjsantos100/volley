# Volleyball Game Management

A web app for managing volleyball game events at a rental venue.

Players will be able to view upcoming games, join available spots, join waitlists when games are full, and see their own payment status. Admins will manage games, participants, waitlists, payments, cancellations, and waitlist ordering.

## Status

Early implementation. The app has a basic Next.js setup, language toggle, and Supabase authentication foundation.

## Planned Stack

- Next.js with TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase Auth with email/password login
- Supabase Postgres
- Supabase Row Level Security
- Vercel
- Progressive Web App support

## Key Docs

- [Software requirements](docs/software-requirements.md)
- [Technical requirements](docs/technical-requirements.md)
- [Design system](DESIGN.md)

## Notes

- Database changes should use Supabase SQL migrations.
- Passwords require at least 8 characters.
- Supabase email confirmations should stay disabled for signup.
- Secrets and credentials should not be committed.
- Design work should follow `DESIGN.md`.
- Technical decisions should follow `docs/technical-requirements.md`.
- Messages that start with `TODO:` are requests to add the item to `TODO.md`.

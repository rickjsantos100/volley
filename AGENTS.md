# Agent Instructions

## Project Guidance

Before implementing or changing application code, read and follow:

- `DESIGN.md` for the design rules, visual direction, interaction patterns, and UI constraints for the site.
- `docs/technical-requirements.md` for the technical architecture, stack choices, workflows, and technical decisions.

Treat `docs/technical-requirements.md` as the source of truth for technical decisions. If an implementation detail conflicts with that file, follow the technical requirements unless the user explicitly asks to change them.

Treat `DESIGN.md` as the source of truth for design and user experience decisions. New UI should match those rules unless the user explicitly asks for a different direction.

When technical and design guidance both apply, satisfy both. If they appear to conflict, ask the user before making a change that would violate either document.

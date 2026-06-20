# Voley Lisboa Matchday Design Exploration

> Status: experimental. This document is an isolated design proposal and does
> not replace `DESIGN.md`, which remains the active design source of truth.

## 1. Direction

The Matchday direction should feel like a focused sports utility: fast to scan,
confident, compact, and ready for game day. It uses Voley Lisboa's existing
blue and yellow identity without the cream-heavy surfaces, oversized marketing
type, floating labels, or pill-shaped controls of the current system.

The first version covers only:

- Typography.
- Core color and spacing tokens.
- Cards.
- Buttons.
- Simple form controls and states.

## 2. Principles

1. **Lead with the next action.** Dates, times, availability, and the primary
   action should be understood at a glance.
2. **Use contrast for hierarchy.** Navy marks featured matchday moments; white
   carries everyday content; yellow identifies action and urgency.
3. **Stay compact.** Prefer short rows and grouped facts over nested tiles.
4. **Keep shapes athletic.** Corners are softly squared rather than fully
   pill-shaped.
5. **Make states explicit.** Do not communicate availability, errors, or focus
   through color alone.

## 3. Foundations

### Typography

- **Display:** `"Barlow Condensed", "Arial Narrow", sans-serif`.
- **Interface:** `Inter, "Helvetica Neue", Arial, sans-serif`.
- Use Barlow Condensed at weight 700 for match dates, times, scores, and major
  section headings.
- Use Inter for all body text, labels, buttons, inputs, and metadata.
- Use uppercase sparingly for short metadata labels only.

| Role | Family | Size / line height | Weight | Tracking |
| --- | --- | --- | --- | --- |
| Match display | Barlow Condensed | 48px / 48px | 700 | -0.02em |
| Page title | Barlow Condensed | 36px / 38px | 700 | -0.01em |
| Card title | Barlow Condensed | 26px / 28px | 700 | 0 |
| Section title | Inter | 20px / 28px | 700 | -0.01em |
| Body | Inter | 16px / 24px | 400 | 0 |
| Small | Inter | 14px / 20px | 400-600 | 0 |
| Metadata | Inter | 12px / 16px | 700 | 0.08em |

### Core colors

| Token | Value | Role |
| --- | --- | --- |
| `--color-navy` | `#061b6b` | Featured cards, dark text, strong structure |
| `--color-blue` | `#0737a8` | Links, focus, secondary actions |
| `--color-yellow` | `#ffd21a` | Primary actions and key matchday accents |
| `--color-canvas` | `#f5f7fa` | Page background |
| `--color-surface` | `#ffffff` | Cards and form controls |
| `--color-text` | `#101828` | Primary body text |
| `--color-muted` | `#667085` | Secondary information |
| `--color-border` | `#dde2ea` | Card and control borders |
| `--color-success` | `#138a5b` | Available and confirmed states |
| `--color-danger` | `#c73a3a` | Errors, cancelled, and destructive states |

Yellow must always use navy text. White is the default text color on navy.

### Spacing and shape

- Spacing scale: `4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`.
- Page gutter: `16px` mobile, `24px` tablet, `32px` desktop.
- Content maximum width: `1120px`.
- Card and field radius: `12px`.
- Button radius: `10px`.
- Minimum interactive target: `44px` high.
- Default border: `1px solid #dde2ea`.
- Card shadow: `0 8px 24px rgba(16, 24, 40, 0.07)`.

## 4. Cards

### Standard card

- White surface, 1px border, 12px radius, and the default card shadow.
- Padding: `20px` mobile and `24px` from tablet upward.
- Use for forms, account details, and general content.
- Avoid placing secondary cards or stat tiles inside it.

### Featured match card

- Navy surface with white text and a 4px yellow top edge.
- The match date/time uses Barlow Condensed at card-title or display size.
- Supporting facts use white at 72% opacity.
- Put one clear yellow primary action at the bottom or trailing edge.
- Optional court-line decoration must remain subtle and nonessential.

### Compact event card

- White surface with a 4px status edge: blue for scheduled, green for
  available, yellow for nearly full, and red for cancelled.
- Date block is visually distinct but part of the same card, not a nested tile.
- Show no more than three supporting facts in the collapsed state.
- Entire card may be interactive when it opens the event detail.

### Card interaction

- Hover: border shifts to `#0737a8` and shadow strengthens slightly.
- Focus: show a `3px rgba(7, 55, 168, 0.20)` outer ring.
- Pressed: translate down by `1px`; do not use ripple effects.

## 5. Buttons

All buttons use Inter, 14px, weight 700, a 10px radius, and a minimum height of
44px. Use sentence case rather than uppercase.

### Primary

- Yellow background and border with navy text.
- Hover: `#f2c600`.
- Focus ring: `3px rgba(255, 210, 26, 0.35)` plus a navy outline.

### Secondary

- White background, blue border, and blue text.
- Hover background: `#eef3ff`.

### Destructive

- White background, danger border, and danger text.
- Reserve solid danger fills for final destructive confirmation.

### Disabled

- Reduce opacity to 50% and use the default cursor.
- The label must remain readable; do not remove the border.

## 6. Simple Forms

### Field structure

1. Persistent label above the control.
2. Optional hint below the label or control.
3. Input, select, or textarea with a minimum height of 48px.
4. Error message beneath the control when invalid.

Do not use floating labels or placeholders as the only label.

### Inputs and selects

- White background, text color `#101828`, border `#b8c0cc`, 12px radius.
- Horizontal padding: `14px`; vertical padding: `12px`.
- Placeholder: `#98a2b3`.
- Hover border: `#0737a8`.
- Focus border: `#0737a8` with a `3px rgba(7, 55, 168, 0.16)` ring.
- Error border: `#c73a3a` with a matching low-opacity ring.
- Disabled background: `#eef1f5`; disabled text: `#98a2b3`.

### Labels, hints, and errors

- Label: Inter 14px / 20px, weight 600, text color.
- Required marker: danger color, with required status also available to
  assistive technology.
- Hint: Inter 13px / 18px, muted color.
- Error: Inter 13px / 18px, weight 600, danger color, prefixed by an icon or
  the word `Error` where context is not otherwise clear.

### Checkboxes

- Minimum visible size: 18px; enclosing label provides a 44px touch target.
- Checked state uses navy with a white check.
- Focus ring matches text inputs.

## 7. Accessibility and Responsiveness

- Meet WCAG AA contrast for normal text and controls.
- Every interactive element must have a visible keyboard focus state.
- Status must include text, not just a colored edge or badge.
- Forms associate errors and hints with their fields.
- At widths below 640px, card actions stack and become full width.
- Long match titles and player names wrap; they never force horizontal scroll.
- Motion is limited to short color, shadow, and 1px position transitions and is
  disabled when `prefers-reduced-motion` is enabled.

## 8. Out of Scope

This exploration does not yet define navigation, modals, tables, avatars,
charts, full-page layouts, imagery, or production component APIs. It does not
change the current application. Promote these rules into `DESIGN.md` only after
the direction is reviewed and accepted.

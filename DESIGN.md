# Voley Lisboa MATCHDAY Design System

MATCHDAY is the active design direction for the application. It should feel
like a focused sports utility: fast to scan, compact, confident, and ready for
game day.

## Principles

1. Lead with the next action. Dates, times, availability, and the primary
   action should be understood at a glance.
2. Use contrast for hierarchy. Navy marks featured matchday moments, white
   carries everyday content, and yellow identifies action and urgency.
3. Prefer compact rows and grouped facts over nested tiles.
4. Use softly squared athletic shapes rather than pill-shaped controls.
5. Make every state explicit in text; color may reinforce but never replace it.

## Portuguese Voice

- Write in European Portuguese using an upbeat, casual, sporty voice.
- Keep player actions and success moments short and energetic, with natural
  court language such as "Vou jogar" and "Até já no campo".
- Do not use emojis or forced slang. Warmth should come from direct, human copy.
- Keep destructive actions, errors, payments, and admin instructions calm,
  precise, and explicit about their consequences.
- Avoid internal implementation terms and formal product language when a clear
  everyday phrase works better.

## Foundations

- Display font: Barlow Condensed, Arial Narrow, sans-serif, weight 700.
- Interface font: Inter, Helvetica Neue, Arial, sans-serif.
- Use the display font for match dates, times, and major page/card headings.
- Use Inter for body text, controls, labels, navigation, and metadata.
- Canvas: `#f5f7fa`; surface: `#ffffff`; text: `#101828`; muted: `#667085`.
- Navy: `#061b6b`; blue: `#0737a8`; yellow: `#ffd21a`.
- Border: `#dde2ea`; success: `#138a5b`; danger: `#c73a3a`.
- Spacing scale: 4, 8, 12, 16, 24, 32, and 48px.
- Page gutters: 16px mobile, 24px tablet, 32px desktop.
- Content maximum width: 1120px.

## Components

### Cards

- Standard cards use a white surface, 1px border, 12px radius, 20px mobile
  padding (24px on tablet), and `0 8px 24px rgba(16,24,40,.07)` shadow.
- Featured matches use navy, white text, and a 4px yellow top edge.
- Compact events use a 4px status edge: blue scheduled, green available,
  yellow nearly full, and red cancelled.
- Interactive cards strengthen their blue border and shadow on hover, show a
  visible focus ring, and move down 1px while pressed.
- Avoid secondary cards and stat tiles inside cards; use grouped facts or rows.

### Buttons

- Inter 14px/20px, weight 700, 10px radius, minimum height 44px.
- Primary: yellow background/border and navy text.
- Secondary: white background, blue border, and blue text.
- Destructive: white background, danger border, and danger text; reserve solid
  danger for final destructive confirmation.
- Disabled controls retain their border and readable label at 50% opacity.
- Do not use ripples or scale animations.

### Forms

- Use persistent 14px semibold labels above controls. Place hints and explicit
  errors beneath the relevant control and connect them with ARIA attributes.
- Inputs are at least 48px tall with a white surface, `#b8c0cc` border, 12px
  radius, and 14px horizontal padding.
- Focus uses a blue border and a 3px low-opacity blue ring. Errors use the same
  treatment in danger red.
- Checkbox labels provide a 44px touch target.
- Avatar cropping uses direct manipulation: drag to position and wheel or
  two-finger pinch to zoom. Keep keyboard arrow and +/- controls available.
- On fine-pointer devices, avatar capture uses an in-app mirrored camera
  preview. Coarse-pointer-only devices retain the native camera picker.

### Shell And Overlays

- The global header is a compact white surface with a subtle bottom border and
  shadow. Keep product identity central and actions easy to reach.
- Menus, modals, PWA prompts, and confirmation dialogs follow the standard-card
  treatment. Modal actions stack on narrow screens.
- Avatars remain circular because they represent people. Other icon controls
  use a 10px radius.
- Alerts and toasts include explicit text, border, and a low-opacity semantic
  background. Loading placeholders mirror final layouts.

## Page Hierarchy

- Feature the earliest non-cancelled upcoming match on the dashboard. Render
  it beneath a visible "Next game" heading, then group later matches beneath
  "More games" as compact event cards. If only cancelled events remain, show
  compact cancelled cards and no featured card.
- Game detail begins with a back link and explicit page label, then a navy
  match sheet with a yellow left edge and separate date and time. This static
  summary must remain visually distinct from the dashboard's interactive
  featured card. Follow it with the user's participation action, then
  participant and waitlist rows.
- Authentication and profile screens use narrow standard cards with clear,
  persistent labels.

## Accessibility And Responsive Behavior

- Meet WCAG AA contrast and provide visible keyboard focus for every control.
- Interactive targets are at least 44px high.
- At widths below 640px, card and modal actions stack and become full width.
- Long match titles, translations, and player names wrap without horizontal
  scrolling.
- Motion is limited to short color, shadow, and 1px position transitions and is
  disabled when `prefers-reduced-motion` is enabled.

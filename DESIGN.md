# Warm Green Design System

## 1. Visual Theme & Atmosphere

The site should feel warm, confident, organized, and easy to use. The canvas alternates between a neutral-warm cream (`#f2f0eb`) and a ceramic off-white (`#edebe9`), while a layered green palette anchors primary actions, navigation, and feature bands. Gold (`#cba258`) should be used sparingly for special status, premium, or celebratory moments, not as a general accent.

Typography carries most of the product voice. Use an open, readable sans-serif with a friendly but disciplined feel. The preferred implementation font is **Inter**, with `"Helvetica Neue", Helvetica, Arial, sans-serif` as fallback. If a slightly rounder tone is desired, **Manrope** is also acceptable.

Surfaces should use rounded geometry. Buttons are full-pill controls. Cards use a 12px rounded rectangle. Interactive controls should give subtle active feedback, especially the `scale(0.95)` press and ripple feedback on buttons and button-like links.

**Key Characteristics:**
- Four-tier green system: Brand / Accent / House / Uplift, each mapped to a distinct surface role.
- Gold reserved for special status or celebratory moments only.
- Warm-neutral canvas (`#f2f0eb` / `#edebe9`) instead of cold white.
- Open-source sans-serif typography with tight, subtle tracking.
- Full-pill buttons (`50px` radius) with `scale(0.95)` active press and ripple feedback.
- 12px card radius + whisper-soft shadows keep content cards restrained.
- Rem-based spacing scale anchored at 1.6rem (~16px) = `--space-3`, stepping to 6.4rem (~64px).

**Color-block page rhythm:** Cream hero -> White content sections -> Dark-green (`#1E3932`) feature band with white text -> Cream utility zone -> Dark-green (`#1E3932`) footer.

## 2. Color Palette & Roles

### Primary

- **Brand Green** (`#006241`): Main brand green. Use for important headings, key brand moments, and primary identity.
- **Green Accent** (`#00754A`): Brighter action green. Use for primary filled CTAs.
- **House Green** (`#1E3932`): Deep near-black green. Use for footer surfaces, feature-band backgrounds, and high-contrast panels.
- **Green Uplift** (`#2b5148`): Secondary mid-dark green used sparingly for decorative accents.
- **Green Light** (`#d4e9e2`): Pale mint wash used for form-valid-state tints and light green utility surfaces.

### Secondary & Accent

- **Gold** (`#cba258`): Reserved for special status, achievement, premium, or celebratory moments. Do not use as a general-purpose accent.
- **Gold Light** (`#dfc49d`): Softer gold for background washes around special-status sections.
- **Gold Lightest** (`#faf6ee`): Cream-gold page-surface wash for soft premium/celebratory sections.

### Surface & Background

- **White** (`#ffffff`): Primary card and modal surface.
- **Neutral Cool** (`#f9f9f9`): Subtle cool-gray surface for dropdowns, form-card wraps, and quiet utility containers.
- **Neutral Warm** (`#f2f0eb`): Warm cream primary page canvas.
- **Ceramic** (`#edebe9`): Slightly warmer/darker cream for zone separators and soft page-section washes.
- **Black** (`#000000`): Deep ink for very high-contrast controls only.

### Neutrals & Text

- **Text Black** (`rgba(0, 0, 0, 0.87)`): Primary heading and body text color on light surfaces.
- **Text Black Soft** (`rgba(0, 0, 0, 0.58)`): Secondary/metadata text on light surfaces.
- **Text White** (`rgba(255, 255, 255, 1)`): Primary heading/body text on dark green surfaces.
- **Text White Soft** (`rgba(255, 255, 255, 0.70)`): Secondary text on dark-green surfaces.
- **Muted Green Text** (`#33433d`): Muted slate-green for softer text blocks where black feels too severe.

### Semantic & Accent

- **Red** (`#c82014`): Error and destructive state.
- **Yellow** (`#fbbc05`): Warning state.
- **Green Light** (`#d4e9e2` at 33% opacity = `hsl(160 32% 87% / 33%)`): Valid-field tint background.
- **Red Tint** (`hsl(4 82% 43% / 5%)`): Invalid-field tint on forms.

### Black / White Alpha Ladders

Two parallel translucent scales for overlay and secondary-text use:
- `rgba(0,0,0,0.06)` through `rgba(0,0,0,0.90)` in 10% steps for dark overlays on light surfaces.
- `rgba(255,255,255,0.10)` through `rgba(255,255,255,0.90)` in 10% steps for light overlays on dark surfaces.

### Gradient System

Avoid structural gradient tokens. Surface hierarchy should use solid color-blocks and the cream/green surface palette.

## 3. Typography Rules

### Font Family

- **Primary:** `Inter, "Helvetica Neue", Helvetica, Arial, sans-serif`.
- **Alternative:** `Manrope, "Helvetica Neue", Helvetica, Arial, sans-serif` if a slightly rounder tone is desired.
- **Optional Serif:** `Lora, "Iowan Old Style", Georgia, serif` for rare editorial headline moments only.

Do not mix multiple decorative typefaces in ordinary app surfaces.

### Hierarchy

| Role | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|--------|-------------|----------------|-------|
| Display | 5.0rem / 80px | 400-600 | 1.2 | -0.16px | Largest hero display |
| Jumbo | 3.6rem / 58px | 400-600 | 1.2 | -0.16px | Secondary hero headings |
| Hero Large | 2.8rem / 45px | 400-600 | 1.2-1.5 | -0.16px | Landing section headlines |
| H1 | 24px | 600 | 36px | -0.16px | Brand Green primary heading |
| H2 | 24px | 400 | 36px | -0.16px | Regular-weight section title |
| Body Large | 19px | 400-600 | 33.25px (~1.75) | -0.16px | Hero intro copy, feature-band body |
| Body | 1.6rem / 16px | 400 | 1.5 (24px) | -0.01em | Default body copy |
| Small | 1.4rem / ~14px | 400-600 | 1.5 | -0.01em | Button label, metadata, form labels |
| Micro | 1.3rem / ~13px | 400 | 1.5 | -0.01em | Caption micro-copy |
| Button Label | 14-16px | 400-600 | 1.2 | -0.01em | Pill-button labels |

**Letter-spacing tokens:**
- `letterSpacingNormal`: `-0.01em`.
- `letterSpacingLoose`: `0.1em`.
- `letterSpacingLooser`: `0.15em`.

**Line-height tokens:**
- `lineHeightNormal`: `1.5`.
- `lineHeightCompact`: `1.2`.

### Principles

- Use subtle negative tracking where it improves the confident, compact feel.
- Let weight and color carry hierarchy before adding more size steps.
- Body text should use `rgba(0,0,0,0.87)` rather than pure black.
- Decorative or serif type should be rare and localized.

## 4. Component Stylings

### Buttons

**Primary Filled**
- Background: `#00754A` (Green Accent)
- Text: `#ffffff`
- Border: `1px solid #00754A`
- Radius: `50px`
- Padding: `7px 16px`
- Font: 16px, weight 600, letter-spacing `-0.01em`
- Active state: `transform: scale(0.95)`
- Feedback: subtle ripple on press
- Transition: `all 0.2s ease`

**Primary Outlined**
- Background: transparent
- Text: `#00754A`
- Border: `1px solid #00754A`
- Same radius/padding/active/transition as Primary Filled.

**Black Filled**
- Background: `#000000`
- Text: `#ffffff`
- Border: `1px solid #000000`
- Radius: `50px`
- Padding: `7px 16px`
- Font: 14px, weight 600
- Use only for high-contrast conversion moments.

**Dark Outlined**
- Background: transparent
- Text: `rgba(0, 0, 0, 0.87)`
- Border: `1px solid rgba(0, 0, 0, 0.87)`
- Radius: `50px`
- Padding: `7px 16px`
- Font: 14px, weight 600

**Inverted on Dark**
- Background: `#ffffff`
- Text: `#00754A`
- Border: `1px solid #ffffff`
- Use when the surface behind the button is House Green.

**Outlined on Dark**
- Background: transparent
- Text: `#ffffff`
- Border: `1px solid #ffffff`
- Use on dark-green feature bands for secondary actions.

### Cards & Containers

**Content Card**
- Background: `#ffffff`
- Radius: `12px`
- Shadow: `0px 0px .5px 0px rgba(0,0,0,0.14), 0px 1px 1px 0px rgba(0,0,0,0.24)`
- Use for repeated content, dashboard summaries, game cards, and framed tools.

**Status Card**
- Background: usually `#ffffff` or `#1E3932` depending on importance.
- Radius and shadow follow default card spec.
- Use for stateful items such as game status, payment status, waitlist position, or admin summaries.

**Dropdown Menu**
- Background: `#f9f9f9`
- Menu items at `24px / weight 400` in Text Black.
- No border; use background shift and shadow to separate it from the page.

**Modal**
- Padding: `2.4rem`
- Top padding: `8.8rem` when room is needed for close controls or a header.
- Radius inherits from card spec (`12px`).

### Inputs & Forms

**Floating Label Input**
- Label floats above the input border when focused/filled.
- Desktop label font size: `1.9rem` default, animates to `1.4rem` when active.
- Mobile label font size: `1.6rem` default, animates to `1.3rem` active.
- Label horizontal offset: `12px` from left.
- Active label translate: up to `-12px` with `-50%` Y translation.
- Field padding: `12px`.
- Validation: valid-field gets `rgba(green-light, 0.33)` tint; invalid-field gets `rgba(red, 0.05)` tint.

**Option Icon**
- Padding: `3px` inner.
- Use a subtle checked-state animation; avoid distracting bounce.

### Navigation

**Global Nav**
- Fixed position with progressive heights: `64px` xs -> `72px` mobile -> `83px` tablet -> `99px` desktop.
- Shadow stack: `0 1px 3px rgba(0,0,0,0.1), 0 2px 2px rgba(0,0,0,0.06), 0 0 2px rgba(0,0,0,0.07)`.
- Left: product or app identity.
- Primary links inline in the primary font, weight 400-600.
- Right: account/session actions where needed.

**Sub-nav**
- Height: `53px` global subnav / `48px` internal subnav.
- Use for horizontal tab groups beneath the global nav.

**Mobile Nav**
- Collapses to a drawer below tablet breakpoint.

### Image Treatment

- **Hero imagery:** Use domain-specific imagery or app-relevant visuals. Avoid generic stock-feeling imagery.
- **Content thumbnails:** Square or 4:3 imagery with clean white/cream backdrops where applicable.
- **Image fade-in:** `opacity 0.3s ease-in` transition on image load.

### Feature Band

Full-width `#1E3932` (House Green) band with:
- Left: white headline + subhead + CTA row.
- Right: relevant product, app, or domain imagery when useful.
- Split ratio ~40/60 or 50/50 depending on section.
- White text throughout with `rgba(255,255,255,0.70)` for secondary copy.
- CTAs follow Inverted on Dark + Outlined on Dark pairing.

### Expander / Accordion

- Duration: `300ms`.
- Timing curve: `cubic-bezier(0.25, 0.46, 0.45, 0.94)`.
- Use for FAQs, grouped settings, or secondary details.

## 5. Layout Principles

### Spacing System

Rem-based semantic scale:

| Token | Rem | Pixels | Typical Use |
|-------|-----|--------|-------------|
| `--space-1` | `0.4rem` | 4px | Tightest inline padding |
| `--space-2` | `0.8rem` | 8px | Small gap, button vertical padding |
| `--space-3` | `1.6rem` | 16px | Default card padding, outer gutter xs |
| `--space-4` | `2.4rem` | 24px | Section inner spacing, outer gutter md |
| `--space-5` | `3.2rem` | 32px | Major between-section spacing |
| `--space-6` | `4rem` | 40px | Large gaps, outer gutter lg |
| `--space-7` | `4.8rem` | 48px | Section-to-section spacing |
| `--space-8` | `5.6rem` | 56px | Very large breathing |
| `--space-9` | `6.4rem` | 64px | Widest section padding |

**Gutter tokens:**
- `--outerGutter: 1.6rem` (16px, default / mobile)
- `--outerGutterMedium: 2.4rem` (24px, tablet)
- `--outerGutterLarge: 4.0rem` (40px, desktop)

**Universal rhythm constant:** `1.6rem` (16px) is the default outer gutter, card padding baseline, and body text size.

### Grid & Container

- Column width scale: `--columnWidthSmall: 343px` / `Medium: 500px` / `Large: 720px` / `XLarge: 1440px`.
- Repeated-card grids should move from 1-up on mobile to 2-4-up on larger screens depending on content density.
- Hero sections may use an asymmetric 40/60 or 50/50 split, collapsing to stacked on mobile.

### Whitespace Philosophy

Section padding should be generous but not wasteful. Content blocks are separated by whitespace rather than dividers. The cream canvas (`#f2f0eb`) provides visual breathing room between white cards and green feature bands.

### Border Radius Scale

| Value | Use |
|-------|-----|
| `12px` | Cards, modals, tiles |
| `12px 12px 0 0` | Top-rounded edge tabs |
| `50px` | Pill buttons |
| `50%` | Circular icons and avatar thumbnails |

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Card | `0 0 0.5px rgba(0,0,0,0.14), 0 1px 1px rgba(0,0,0,0.24)` | Default content cards |
| Global Nav | `0 1px 3px rgba(0,0,0,0.1), 0 2px 2px rgba(0,0,0,0.06), 0 0 2px rgba(0,0,0,0.07)` | Fixed top bar |

**Shadow philosophy:** Use whisper-soft layered shadows over solid surfaces. Avoid single heavy drop shadows.

### Decorative Depth

- No structural gradient system; surfaces are solid color-block.
- Color-block banding carries perceived depth.
- Use SVG filter shadows only when a specific asset needs physicality.

## 7. Do's and Don'ts

### Do
- Use Neutral Warm (`#f2f0eb`) or Ceramic (`#edebe9`) as page canvas instead of pure white.
- Map the green tiers to their intended surface role: Brand Green for headings, Green Accent for CTAs, House Green for deep bands, Uplift for decorative accents.
- Keep tracking subtly tight where it remains readable.
- Use 50px full-pill radius on primary buttons.
- Apply `transform: scale(0.95)` as the universal button active state.
- Apply subtle ripple feedback to buttons and links styled as buttons.
- Reserve Gold for special status or celebratory moments only.
- Layer 2-3 low-alpha shadows instead of one heavy drop shadow.
- Let the cream canvas breathe between content cards; use whitespace, not dividers.

### Don't
- Don't use pure white as the page canvas by default.
- Don't flatten the green system into a single color.
- Don't use Gold as a general-purpose accent.
- Don't square primary action buttons.
- Don't introduce gradient fills as a default surface treatment.
- Don't use pure black for body text.
- Don't skip active feedback on buttons.
- Don't stack single heavy shadows.

## 8. Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|------|-------|-------------|
| xs | < 480px | Global nav 64px; drawer menu; single-column layouts; pill buttons full-width where needed |
| Mobile | 480-767px | Global nav 72px; card padding tightens |
| Tablet | 768-1023px | Global nav 83px; multi-column layouts begin |
| Desktop | 1024-1439px | Global nav 99px; full split heroes and wider card grids |
| XLarge | 1440px+ | Content caps at `--columnWidthXLarge`; extra cream margin |

### Touch Targets

- Buttons should meet comfortable mobile touch targets. Increase visual padding on mobile when compact desktop pills would feel too small.
- Form float-label inputs grow their label font size on mobile for readability.

### Collapsing Strategy

- Global nav height scales progressively: 64 -> 72 -> 83 -> 99px.
- Hero split collapses from split layout to stacked at mobile.
- Repeated-card grids collapse to fewer columns as the viewport narrows.
- Feature bands stay full-width but text + imagery stack vertically on mobile.
- Outer gutter scales from 16px -> 24px -> 40px.

### Image Behavior

- Hero imagery may crop tighter vertically on mobile.
- Content imagery should preserve aspect ratio.
- Use `opacity 0.3s ease-in` fade-in transition on image load.

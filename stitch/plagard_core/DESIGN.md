---
name: Plagard Core
colors:
  surface: '#111317'
  surface-dim: '#111317'
  surface-bright: '#37393e'
  surface-container-lowest: '#0c0e12'
  surface-container-low: '#1a1c20'
  surface-container: '#1e2024'
  surface-container-high: '#282a2e'
  surface-container-highest: '#333539'
  on-surface: '#e2e2e8'
  on-surface-variant: '#c2c6d6'
  inverse-surface: '#e2e2e8'
  inverse-on-surface: '#2f3035'
  outline: '#8c909f'
  outline-variant: '#424754'
  surface-tint: '#adc6ff'
  primary: '#adc6ff'
  on-primary: '#002e6a'
  primary-container: '#4d8eff'
  on-primary-container: '#00285d'
  inverse-primary: '#005ac2'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#ffb786'
  on-tertiary: '#502400'
  tertiary-container: '#df7412'
  on-tertiary-container: '#461f00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffdcc6'
  tertiary-fixed-dim: '#ffb786'
  on-tertiary-fixed: '#311400'
  on-tertiary-fixed-variant: '#723600'
  background: '#111317'
  on-background: '#e2e2e8'
  surface-variant: '#333539'
typography:
  h1:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  body-base:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.4'
  mono-code:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.6'
  label-caps:
    fontFamily: Space Grotesk
    fontSize: 11px
    fontWeight: '700'
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 16px
  margin: 24px
  container-max: 1440px
  stack: '{''xs'': ''4px'', ''sm'': ''8px'', ''md'': ''16px'', ''lg'': ''24px'', ''xl'':
    ''48px''}'
---

## Brand & Style

The design system is engineered for high-density information management and rapid technical decision-making. It adopts a **Technical Minimalism** style, blending the utility of a command-line interface with the sophistication of modern SaaS platforms. The aesthetic is "Dark-first," prioritizing reduced eye strain for long-duration monitoring.

The brand personality is authoritative, precise, and unobtrusive. It avoids decorative flourishes in favor of functional clarity. The UI should evoke a sense of total control and stability, utilizing subtle micro-interactions to confirm system states without distracting the user from critical data.

## Colors

This design system utilizes a deep charcoal palette to provide a low-luminance foundation. The "Deep Charcoal" (#0F1115) acts as the base canvas, while slightly lighter shades define surface hierarchy. 

Vibrant functional colors are reserved strictly for status communication and primary actions. 
- **Emerald Green** signals healthy containers and successful deployments.
- **Rose Red** highlights critical failures and stopped instances.
- **Amber Yellow** indicates resource throttling or pending states.
- **Electric Blue** is used for interactive elements and informational tags.

Grayscale values are meticulously tiered to maintain contrast ratios that meet WCAG AA standards while preserving the dark aesthetic.

## Typography

Typography in this design system is split between two functional worlds: Navigation/UI and Technical Data. 

**Inter** serves as the primary typeface for all interface elements, chosen for its exceptional legibility at small sizes and its neutral, systematic feel. **Space Grotesk** is used sparingly for labels and metadata headers to inject a subtle futuristic, technical edge.

For logs, terminal outputs, and container IDs, a high-quality **monospace** font is mandatory. This ensures that character alignment is preserved in tabular data and code snippets. All headers use tight letter spacing to maintain a compact, "engineered" appearance.

## Layout & Spacing

The design system employs a **Fluid-Fixed Hybrid** layout. Sidebars and navigation rails are fixed-width to ensure immediate access to controls, while the main dashboard area utilizes a 12-column fluid grid. 

A 4px baseline grid governs all spatial relationships, creating a "tight" technical rhythm. High-density views (like container lists) should use the `sm` (8px) padding scale, while overview dashboards utilize `md` (16px) or `lg` (24px) for better visual breathing room. Content should be grouped logically into cards that expand to fill their grid columns.

## Elevation & Depth

Depth in this design system is achieved through **Tonal Layering** rather than traditional shadows. This maintains the minimalist, "flat" aesthetic preferred by developers.

- **Level 0 (Base):** Deep Charcoal (#0F1115). Used for the main background.
- **Level 1 (Surface):** Slightly lighter (#161B22). Used for cards and primary content containers.
- **Level 2 (Overlay):** Used for tooltips, dropdowns, and modals. These are the only elements allowed to have a subtle, 1px border (#374151) and a very soft, high-blur shadow to separate them from the content below.

Avoid heavy blurs or frosted-glass effects to keep the interface fast and performance-oriented.

## Shapes

The design system utilizes a **Soft (4px)** corner radius for most components. This subtle rounding softens the technical edge of the platform without losing the "industrial" feel of a terminal.

- **Standard Buttons & Inputs:** 4px radius.
- **Cards & Terminal Windows:** 6px to 8px radius.
- **Status Tags:** 2px radius (near-sharp) to distinguish them as static indicators rather than interactive buttons.
- **Search Bars:** Can utilize a higher radius (up to 20px) to differentiate global navigation from functional data inputs.

## Components

### Buttons
Primary buttons use a solid Electric Blue fill. Hover states should brighten the fill by 10%, and active states should shift slightly darker. Secondary buttons are "ghost" style with a 1px border.

### Technical Data Tables
Tables must support high-density data. Rows should have a subtle hover highlight (#1F2937). Use monospaced fonts for IDs and IP addresses. Column headers should use the `label-caps` typography style.

### Terminal Component
The terminal is a signature element. It uses a pure black background (#000000) with a 1px charcoal border. Text should be Emerald Green for output and White for user input. Include a blinking cursor block for authenticity.

### Cards
Cards are the primary layout unit. They feature no shadows, relying instead on a 1px border (#1F2937) against the #161B22 surface. 

### Status Chips
Small, compact badges with a low-opacity background of the status color (e.g., 10% Emerald Green) and a high-contrast 1px solid border of the same color.
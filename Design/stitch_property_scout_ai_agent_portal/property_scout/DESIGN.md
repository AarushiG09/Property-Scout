---
name: Property Scout
colors:
  surface: '#fcf8fa'
  surface-dim: '#dcd9db'
  surface-bright: '#fcf8fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f5'
  surface-container: '#f0edef'
  surface-container-high: '#eae7e9'
  surface-container-highest: '#e4e2e4'
  on-surface: '#1b1b1d'
  on-surface-variant: '#45464d'
  inverse-surface: '#303032'
  inverse-on-surface: '#f3f0f2'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#006a63'
  on-secondary: '#ffffff'
  secondary-container: '#99efe5'
  on-secondary-container: '#006f67'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#00201c'
  on-tertiary-container: '#009485'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#9cf2e8'
  secondary-fixed-dim: '#80d5cb'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#00504a'
  tertiary-fixed: '#71f8e4'
  tertiary-fixed-dim: '#4fdbc8'
  on-tertiary-fixed: '#00201c'
  on-tertiary-fixed-variant: '#005048'
  background: '#fcf8fa'
  on-background: '#1b1b1d'
  surface-variant: '#e4e2e4'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1440px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
  stack-xs: 4px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
  stack-xl: 48px
---

## Brand & Style
The design system for this product is rooted in **Corporate Minimalism** with a focus on high-end editorial clarity. It is designed for real estate professionals who require a sophisticated, high-performance environment to manage complex data without cognitive overload.

The aesthetic prioritizes a "Quiet Luxury" feel—utilizing generous whitespace, precision alignment, and a restrained color application that allows property imagery and financial metrics to remain the focal point. The emotional response is one of institutional trust, technical competence, and effortless efficiency.

## Colors
This design system utilizes a foundation of deep neutrals contrasted against a sophisticated teal spectrum.

- **Primary (#0F172A):** Reserved for high-level navigation, primary headings, and critical action buttons to establish authority.
- **Accents:** The Teal (#0F766E) and Emerald (#14B8A6) are used for interactive states, data visualization, and emphasizing growth or opportunity.
- **Neutrals:** The background and surface colors are tuned to minimize eye strain during long sessions. Use the Border color (#E2E8F0) for subtle structural separation without creating visual noise.

## Typography
The system uses **Inter** exclusively to leverage its exceptional legibility in data-dense interfaces.

- **Headlines:** Use tight letter-spacing on larger sizes to maintain a premium, editorial feel. 
- **Numerical Data:** For financial tables and property specs, ensure `tabular-nums` (font-variant-numeric) is enabled to keep columns aligned.
- **Hierarchy:** Use the `text-muted` color for secondary information rather than smaller font sizes to maintain readability.

## Layout & Spacing
The layout follows a **Fixed-Fluid Hybrid** model. The main content area caps at 1440px but utilizes a fluid 12-column grid within that container.

- **Desktop:** 12-column grid, 24px gutters, 32px outer margins. Use sidebar navigation for SaaS functionality.
- **Tablet:** 8-column grid, 20px gutters, 24px margins. Sidebars collapse into icons or a hamburger menu.
- **Mobile:** 4-column grid, 16px gutters, 16px margins. Content stacks vertically.
- **Rhythm:** All vertical spacing should be multiples of 8px to ensure a consistent visual cadence.

## Elevation & Depth
Depth is conveyed through **Tonal Layering** and **Ambient Shadows** rather than heavy borders.

- **Level 0 (Background):** #F7F9FC.
- **Level 1 (Cards/Surface):** #FFFFFF with a subtle 1px border (#E2E8F0) and a soft drop shadow: `0 4px 6px -1px rgba(15, 23, 42, 0.05)`.
- **Level 2 (Hover/Active):** Slightly deeper shadow: `0 10px 15px -3px rgba(15, 23, 42, 0.08)`.
- **Level 3 (Modals/Overlays):** Significant depth: `0 20px 25px -5px rgba(15, 23, 42, 0.1)`.

Avoid inner shadows or heavy bevels. Surfaces should feel light and lifted.

## Shapes
The shape language is "Approachable Professional." 

- **Standard Elements:** Use `0.5rem` (8px) for buttons, input fields, and small UI components.
- **Large Elements (Cards/Modals):** Use `rounded-lg` (16px) to create a distinct, modern container for property listings and data modules.
- **Pills:** Used exclusively for status badges (e.g., "Active," "Sold") to differentiate them from interactive buttons.

## Components
- **Buttons:** 
  - *Primary:* Solid Dark Navy (#0F172A) with white text. 
  - *Secondary:* Ghost style with Teal (#0F766E) text and no background unless hovered.
- **Cards:** 16px corner radius. Image-heavy cards should use a subtle 10% gradient overlay at the bottom for text legibility.
- **Inputs:** 1px border (#E2E8F0), focusing to Teal (#14B8A6) with a soft outer glow. Use 14px text for high-density forms.
- **Data Tables:** Row-based layouts with #F7F9FC zebra striping on hover. No vertical dividers; use horizontal dividers only (#E2E8F0).
- **Property Badges:** Small, uppercase labels with a 10% opacity tint of the status color (e.g., Success green for "Available").
- **Icons:** Use 20px or 24px stroke-based icons (1.5px weight). Icons should match the text color of their parent element.
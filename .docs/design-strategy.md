# SciOly Platform Design Strategy

This document outlines the UI/UX strategy focusing on a modern, minimalistic B2B SaaS aesthetic (similar to Vercel, Linear, or Stripe), emphasizing clean lines over shadows, and strictly prioritizing responsive design.

---

## 1. Core Aesthetic Philosophy
Modern SaaS platforms thrive on clarity, performance, and minimalistic interfaces. We will avoid heavy shadows, aggressive glassmorphism, or bloated animations.
- **Flat Depth:** Instead of using shadows to indicate depth or elevation, we will use subtle background color variations (e.g., `bg-muted` vs `bg-background`) and crisp 1px borders (`border-border`).
- **Typography:** We will utilize **Inter** as the global application font. Inter is explicitly designed for highly legible, modern user interfaces and is a staple in premium tech tools.
- **Micro-interactions:** Animations will be instantaneous and purposeful. For example, a crisp opacity change or a 100ms background color shift on hover (`hover:bg-accent hover:text-accent-foreground`). No bouncing or scaling.

## 2. Universal B2B Color Scheme & Theming

Because the platform will host multiple independent schools, it is crucial that the default color palette is universal, professional, and high-trust. We will build around a pure, tech-forward blue/indigo accent alongside neutral slates.

- **Default Theme:** **Light Mode** will be the default experience for all new users, ensuring a clean, highly legible, accessible academic environment. Dark Mode will be available via user toggle.

### Light Mode (The Default Experience)
- **Backgrounds:** Pure white (`oklch(1 0 0)`) for primary surfaces (dashboards, forms, exam portals).
- **Cards/Elevated:** Off-white/slate (`oklch(0.98 0 0)`) to gracefully separate sections.
- **Brand/Primary Accent:** A universal, high-trust "Tech Blue" (e.g., `oklch(0.60 0.15 250)`) for CTA buttons (Login, Submit, Start Exam). 
- **Borders:** Very subtle grays (`oklch(0.92 0 0)`) for division without clutter.
- **Text:** Crisp dark slate (`oklch(0.20 0 0)`) rather than absolute black to reduce eye strain.

### Dark Mode (Sleek & Focused)
- **Backgrounds:** Near-black or deep charcoal (`oklch(0.15 0 0)`). 
- **Cards/Elevated:** A slightly lighter matte grey (`oklch(0.20 0 0)`) with a 1px `oklch(0.25 0 0)` border.
- **Text Contrast:** High-contrast off-white (`oklch(0.98 0 0)`) for headers, and muted gray (`oklch(0.70 0 0)`) for standard readability.

## 3. Responsive Web Design (Mobile-First)

The most critical requirement for this platform is flawless rendering across all viewports (Mobile, Tablet, Desktop, Wide-Monitor).

### Layout Fluidity
- **CSS Grid & Flexbox:** All major structural components will utilize flexible grids (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`). 
- **Spacings:** Paddings and margins will scale fluidly (`p-4 md:p-6 lg:p-8`) to give data room to breathe on desktops while remaining compact on phones.

### Component Behaviors per Viewport
- **Navigation:**
  - *Desktop:* Fixed sidebar or horizontal top bar with full labels.
  - *Mobile:* Collapses into a sleek bottom navigation bar or a clean hamburger menu (Sheet component) to save vertical screen space.
- **Data Tables (Leaderboards, Rosters):**
  - *Desktop:* Full multi-column view with pagination.
  - *Mobile:* Tables collapse into scrollable horizontal containers (`overflow-x-auto`), or transform into a Stacked Card approach where each row becomes a vertically stacked card to prevent ugly horizontal squishing.
- **Exam Portal (Side-by-Side):**
  - *Desktop:* 50/50 vertical split (Left: PDF, Right: Bubble Sheet).
  - *Mobile:* Stacked layout (Top: PDF viewer fixed height, Bottom: Bubble Sheet scrollable view), or a multi-step wizard where they view the PDF, then swipe to enter answers.

## 4. Next Steps for Implementation
1. **Refine `globals.css`**: Map the pure whites, tech blues, and deep slates to the OKLCH design tokens.
2. **Inject Inter**: Configure `layout.tsx` to automatically pull in and default to Google's Inter font.
3. **Audit Components**: Strip out any unnecessary `shadow-md` classes from existing Shadcn UI components (Cards, Buttons, Dialogs) and replace them with solid `border` definitions.
4. **Viewport Testing**: Implement the first core dashboard layout and forcefully test the breakpoints (`sm`, `md`, `lg`, `xl`) to guarantee zero horizontal overflow bugs.

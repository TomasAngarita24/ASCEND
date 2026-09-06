# DESIGN.md — ASCEND Design System & Visual Guidelines

## 1. Aesthetic Identity & Theme Philosophy
ASCEND employs a **Cyber-Athletic Minimalist** design language:
- **Atmosphere**: Deep high-contrast dark space (`#040816`) with purposeful neon accents (Electric Teal `#22f0c5` and Vivid Emerald `#22c55e`), crisp glass-surface layering, and clean GainFlow-inspired ergonomic layouts.
- **Dual-Theme Support**: Dark (default, battery-efficient in OLED/mobile) and Crisp Light (`#f1f5f9`).

---

## 2. Color Palette & Token System

### Dark Theme (Primary Default)
| Token | Hex / Value | Purpose |
|---|---|---|
| `--bg-color` | `#040816` | Main application backdrop |
| `--sidebar-bg` | `#0b0f19` | Persistent navigation rail |
| `--surface-color` | `#0f1417` | Cards, hero banners, panels |
| `--card-color` | `#111827` | Inner workout rows and modules |
| `--card-hover` | `#172033` | Interactive hover state |
| `--border-color` | `rgba(255, 255, 255, 0.08)` | Subtle translucent divider |
| `--accent-teal` | `#22f0c5` | Primary action accent, active tabs, 1RM charts |
| `--accent-green` | `#22c55e` | Success states, set completion checkboxes |
| `--accent-blue` | `#2563eb` | Secondary buttons, primary links |
| `--text-primary` | `#E6EEF3` | Headings, active values, high contrast |
| `--text-secondary` | `#cbd5e1` | Subheadings, input values |
| `--text-muted` | `#94a3b8` | Metadata, unit labels (kg, reps), placeholders |
| `--danger-color` | `#ef4444` | Set deletion, workout cancellation, error alerts |

### Light Theme
| Token | Hex / Value | Purpose |
|---|---|---|
| `--bg-color` | `#f1f5f9` | Light slate backdrop |
| `--sidebar-bg` | `#ffffff` | Pure white navigation rail |
| `--surface-color` | `#ffffff` | Elevated white cards |
| `--card-color` | `#f8fafc` | Input backgrounds and row blocks |
| `--border-color` | `rgba(0, 0, 0, 0.09)` | Crisp neutral borders |
| `--text-primary` | `#0f172a` | High-contrast dark typography |
| `--text-muted` | `#64748b` | Muted slate secondary text |

---

## 3. Typography Hierarchy
- **Font Family**: `'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **Headings**:
  - `H1`: `2.2rem - 2.4rem` | `font-weight: 800` | `letter-spacing: -0.5px`
  - `H2`: `1.25rem - 1.5rem` | `font-weight: 700`
  - `H3`: `1.05rem - 1.15rem` | `font-weight: 700`
- **Body Text**: `0.9rem - 1.0rem` | `font-weight: 400 - 500` | `line-height: 1.5`
- **Data & Numeric Metrics**: Numeric weights, repetitions, 1RM, and timestamps use high-visibility bold styles (`font-weight: 700 - 800`, monospaced alignment for columns).

---

## 4. Layout, Spacing & Elevation Grid
- **Base Spacing Grid**: 8px (`8px`, `16px`, `24px`, `32px`, `48px`).
- **Border Radius Standards**:
  - Small pills & tags: `6px - 8px`
  - Inputs & Action Buttons: `10px - 14px`
  - Cards & Module Containers: `16px - 18px`
  - Full Screen / Modal Dialogs: `24px - 28px`
- **Shadows & Elevation**:
  - Cards: `0 4px 20px rgba(0, 0, 0, 0.25)`
  - Elevated Popups / Modals: `0 16px 48px rgba(0, 0, 0, 0.6)`
  - Glass borders: `1px solid rgba(255, 255, 255, 0.08)` (Dark) / `1px solid rgba(0, 0, 0, 0.08)` (Light)

---

## 5. Component Standards & Patterns

### 🏋️ Active Workout Set Rows
- Layout: Monospaced 5-column grid (`SET #`, `ANTERIOR`, `KG`, `REPS`, `CHECK / ACTION`).
- Visual feedback on completion: Background tints emerald (`rgba(34, 197, 94, 0.15)`), check button changes to filled vibrant green.
- Input focus: Highlight with electric teal border and subtle glow (`box-shadow: 0 0 0 3px rgba(34, 240, 197, 0.2)`).

### 🏷 Muscle & Equipment Badges
- Primary Muscle (Green): `background: rgba(52, 211, 153, 0.15)`, `color: #10b981`
- Equipment (Blue): `background: rgba(96, 165, 250, 0.15)`, `color: #3b82f6`
- Custom Exercise (Amber): `background: rgba(234, 179, 8, 0.15)`, `color: #eab308`

### 🖼 Exercise Card & Image Display
- Ratio: Square/rounded `54x54px` thumbnail for list cards with object-fit cover and fallback icon.
- Detail Panel: Prominent top showcase with high-res anatomical illustrations, English/Spanish names, and structured step-by-step instructions.

---

## 6. Anti-Patterns & Quality Rules
- ❌ **No Generic AI Slop**: Avoid saturated purple/magenta rainbow gradients with no semantic meaning.
- ❌ **No Tiny Tap Targets**: All clickable gym controls must be at least `44x44px` on mobile/touch interfaces.
- ❌ **No Over-Animation**: Keep transitions snappy (`150ms - 200ms ease-out`). Never delay user interaction with long animations.
- ❌ **No Unreadable Low-Contrast Text**: Ensure all text passes WCAG AA contrast against dark/light backgrounds.
- ❌ **No Disorienting Layout Shifts**: When adding/deleting sets or changing tabs, preserve layout stability and scroll position.

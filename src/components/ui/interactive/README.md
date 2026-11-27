# SysCraft interactive primitives

A small, dependency-free motion library built on framer-motion and the existing
warm ink / brass design tokens. Import from `@/components/ui/interactive`.

| Export | Purpose |
| --- | --- |
| `MagneticButton` | Real `<button>` with a spring-based magnetic pull (max 6px). |
| `MagneticLink` | Same motion on a `next/link` anchor. |
| `TiltCard` | Pointer tilt capped at 5° plus a moving brass glare. |
| `AnimatedBeam` | SVG connector with a travelling gradient dash. |
| `ScrollReveal` | in-view opacity / y / blur reveal. |
| `TextReveal` | Word or line stagger for headings, no layout shift. |
| `SpotlightGrid` | Decorative grid with a pointer-following radial wash. |
| `InteractiveBento` / `BentoItem` | Responsive bento grid with hover spotlight. |
| `AnimatedCounter` | In-view spring counter writing directly to the DOM. |

`useMotionPreferences` is an internal, SSR-safe snapshot of `(pointer: fine)`
and `(prefers-reduced-motion: reduce)`. Every component falls back to a fully
static presentation for coarse pointers, reduced-motion users and the server
render. Pointer movement is handled with motion values or direct CSS custom
property writes — it never causes a React re-render.

No new dependencies, no external assets, and no geometry animation: movement is
limited to `transform`, `opacity`, `filter` (reveals) and SVG `strokeDashoffset`
(beams).

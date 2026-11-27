'use client';

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useMotionPreferences } from './useMotionPreferences';

export interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  /** Tilt magnitude in degrees, clamped to a maximum of 5. Defaults to 5. */
  intensity?: number;
  /** Render the pointer-following glare layer. Defaults to true. */
  glare?: boolean;
}

const TILT_SPRING = { stiffness: 180, damping: 20, mass: 0.5 };
const GLARE_SPRING = { stiffness: 200, damping: 26, mass: 0.5 };

/**
 * Pointer-driven 3D tilt with a soft brass spotlight. Both the rotation and
 * the glare are motion values, so moving the pointer triggers zero React
 * renders. Touch devices and reduced-motion users see a flat, static card.
 */
export function TiltCard({
  children,
  className,
  intensity = 5,
  glare = true,
}: TiltCardProps) {
  const { finePointer, reducedMotion } = useMotionPreferences();
  const enabled = finePointer && !reducedMotion;
  const max = Math.max(0, Math.min(5, intensity));

  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const glareOpacity = useSpring(0, GLARE_SPRING);

  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), TILT_SPRING);
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), TILT_SPRING);

  // The glare plane is 200% of the card and starts centred; a +/-25% shift of
  // the plane equals a full sweep across the card. Transform only — no
  // background-position or layout animation.
  const glareX = useTransform(px, [0, 1], ['-25%', '25%']);
  const glareY = useTransform(py, [0, 1], ['-25%', '25%']);

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (!enabled) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    px.set((event.clientX - rect.left) / rect.width);
    py.set((event.clientY - rect.top) / rect.height);
    glareOpacity.set(1);
  };

  const onPointerLeave = (): void => {
    px.set(0.5);
    py.set(0.5);
    glareOpacity.set(0);
  };

  return (
    <div className={className}>
      <motion.div
        className="preserve-3d relative rounded-[inherit]"
        style={{ rotateX, rotateY, transformPerspective: 1000 }}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      >
        {children}
        {glare && enabled && (
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
            style={{ opacity: glareOpacity }}
          >
            <motion.span
              className="absolute -left-1/2 -top-1/2 h-[200%] w-[200%]"
              style={{
                x: glareX,
                y: glareY,
                background:
                  'radial-gradient(circle at 50% 50%, rgb(var(--accent-bright) / 0.18), transparent 25%)',
              }}
            />
          </motion.span>
        )}
      </motion.div>
    </div>
  );
}

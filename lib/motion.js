// Shared Framer Motion tokens for the premium redesign (K3).
// Springs + durations used across Hero, SectionHeading, Navbar and overlays.
export const spring = { stiffness: 400, damping: 30 };
export const duration = { fast: 0.25, base: 0.4, slow: 0.6 };
export const motionConfig = { reducedMotion: "user" };
export const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } };
export const fadeIn = { hidden: { opacity: 0 }, visible: { opacity: 1 } };

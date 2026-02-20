import { Variants, Transition } from 'framer-motion';

/** Fade in from transparent */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

/** Slide up from below with fade */
export const slideUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.15 } },
};

/** Scale spring — for modals, summary cards */
export const scaleSpring: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { type: 'spring', damping: 20, stiffness: 300 } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

/** Card flip — 3D rotation for flashcard */
export const cardFlip: Variants = {
  front: { rotateY: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } },
  back: { rotateY: 180, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } },
};

/** Card exit animations based on rating */
export const cardExit = {
  again: { x: -300, opacity: 0, transition: { type: 'spring', tension: 100, friction: 15 } },
  hard: { x: -200, opacity: 0, transition: { type: 'spring', tension: 120, friction: 18 } },
  good: { x: 200, opacity: 0, transition: { type: 'spring', tension: 150, friction: 20 } },
  easy: { x: 400, opacity: 0, transition: { type: 'spring', tension: 200, friction: 15 } },
};

/** Shimmer effect for progress bar */
export const shimmer: Variants = {
  animate: {
    x: ['-100%', '100%'],
    transition: { duration: 1.5, repeat: Infinity, ease: 'linear' },
  },
};

/** Checkmark draw animation */
export const checkmarkDraw: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: { pathLength: 1, opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } },
};

/** Button press */
export const buttonPress = {
  whileTap: { scale: 0.95, transition: { duration: 0.1 } },
  whileHover: { scale: 1.02, transition: { duration: 0.15 } },
};

/** Stagger children — for lists */
export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

/** Toast slide-in from top */
export const toastSlide: Variants = {
  hidden: { opacity: 0, y: -50, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', damping: 20 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
};

/** Level-up celebration */
export const levelUp: Variants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: [0, 1.2, 1],
    opacity: 1,
    transition: { duration: 0.5, times: [0, 0.7, 1] },
  },
};

/** Confetti burst config */
export const confettiConfig = {
  particleCount: 40,
  spread: 60,
  gravity: 0.8,
  scalar: 0.8,
  drift: 0,
  ticks: 200,
  origin: { x: 0.5, y: 0.6 },
};

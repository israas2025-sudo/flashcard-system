/**
 * index.ts -- Barrel export for the design system module.
 *
 * Re-exports all components, tokens, and animations from the design system
 * so consumers can import from a single entry point:
 *
 * ```typescript
 * import {
 *   Button,
 *   Card,
 *   Input,
 *   colors,
 *   fadeIn,
 * } from './design-system';
 * ```
 */

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

export { Button } from './components/Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './components/Button';

export { Card } from './components/Card';
export type { CardProps, CardVariant } from './components/Card';

export { Input } from './components/Input';
export type { InputProps, InputVariant } from './components/Input';

export { Select } from './components/Select';
export type { SelectProps, SelectOption } from './components/Select';

export { TagChip } from './components/TagChip';
export type { TagChipProps, TagChipSize } from './components/TagChip';

export { ProgressBar } from './components/ProgressBar';
export type {
  ProgressBarProps,
  ProgressVariant,
  ProgressSize,
} from './components/ProgressBar';

export { ToastProvider, useToast } from './components/Toast';
export type {
  ToastType,
  ToastMessage,
  ToastOptions,
  ToastProviderProps,
} from './components/Toast';

export { Modal } from './components/Modal';
export type { ModalProps, ModalSize } from './components/Modal';

export { Tooltip } from './components/Tooltip';
export type { TooltipProps, TooltipPosition } from './components/Tooltip';

export { Skeleton } from './components/Skeleton';
export type { SkeletonProps, SkeletonVariant } from './components/Skeleton';

export { Badge } from './components/Badge';
export type { BadgeProps, BadgeVariant, BadgeSize } from './components/Badge';

export { Tabs, TabsPanel } from './components/Tabs';
export type { TabsProps, TabItem, TabsPanelProps } from './components/Tabs';

// ---------------------------------------------------------------------------
// Design Tokens
// ---------------------------------------------------------------------------

export {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  animation,
  layout,
  zIndex,
  breakpoints,
} from './tokens';

// ---------------------------------------------------------------------------
// Animations
// ---------------------------------------------------------------------------

export {
  fadeIn,
  slideUp,
  scaleSpring,
  cardFlip,
  cardExit,
  shimmer,
  checkmarkDraw,
  buttonPress,
  staggerContainer,
  toastSlide,
  levelUp,
  confettiConfig,
} from './animations';

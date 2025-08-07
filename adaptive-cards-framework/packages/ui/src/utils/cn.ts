import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes with proper override handling
 * Combines clsx for conditional classes and tailwind-merge for deduplication
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Utility function to create responsive class variants
 */
export function responsive(base: string, variants: Record<string, string>) {
  const classes = [base];
  
  Object.entries(variants).forEach(([breakpoint, className]) => {
    if (breakpoint === 'base') {
      // Replace base class
      classes[0] = className;
    } else {
      classes.push(`${breakpoint}:${className}`);
    }
  });
  
  return classes.join(' ');
}

/**
 * Utility function to create dark mode variants
 */
export function darkMode(light: string, dark: string) {
  return `${light} dark:${dark}`;
}

/**
 * Utility function to create focus-visible styles
 */
export function focusRing(ring = 'ring-2 ring-ring ring-offset-2') {
  return `focus-visible:outline-none focus-visible:${ring}`;
}

/**
 * Utility function to create hover and focus states
 */
export function interactiveStates(hover?: string, focus?: string, active?: string) {
  const states = [];
  
  if (hover) states.push(`hover:${hover}`);
  if (focus) states.push(focusRing(focus));
  if (active) states.push(`active:${active}`);
  
  return states.join(' ');
}

/**
 * Utility function to create disabled styles
 */
export function disabledStyles(disabled = 'disabled:pointer-events-none disabled:opacity-50') {
  return disabled;
}

/**
 * Utility function for animation classes
 */
export function animate(
  animation: string,
  duration = 'duration-200',
  easing = 'ease-in-out'
) {
  return `transition-${animation} ${duration} ${easing}`;
}
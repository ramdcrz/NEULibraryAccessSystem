import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats duration in minutes into a readable HR & MIN shorthand.
 * @param totalMinutes The total duration in minutes.
 * @param fallback The string to return if duration is missing or 0.
 * @param allCaps Whether to return the result in all caps (for UI) or Title Case (for PDF).
 */
export function formatDuration(
  totalMinutes: number | null | undefined, 
  fallback: string = 'Ongoing',
  allCaps: boolean = true
): string {
  const result = (() => {
    if (totalMinutes === null || totalMinutes === undefined || totalMinutes === 0) {
      return fallback;
    }
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours === 0) {
      return `${totalMinutes} min`;
    }
    
    if (minutes === 0) {
      return `${hours} hr`;
    }
    
    return `${hours} hr & ${minutes} min`;
  })();

  if (allCaps) {
    return result.toUpperCase();
  }

  // Title Case for PDF: "1 Hr & 15 Min"
  return result
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

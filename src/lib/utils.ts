import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats duration in minutes into a readable HR & MIN shorthand.
 * @param totalMinutes The total duration in minutes.
 * @param fallback The string to return if duration is missing or 0.
 */
export function formatDuration(totalMinutes: number | null | undefined, fallback: string = 'Active'): string {
  if (totalMinutes === null || totalMinutes === undefined || totalMinutes === 0) return fallback;
  
  if (totalMinutes < 60) {
    return `${totalMinutes} MIN`;
  }
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (minutes === 0) {
    return `${hours} HR`;
  }
  
  return `${hours} HR & ${minutes} MIN`;
}

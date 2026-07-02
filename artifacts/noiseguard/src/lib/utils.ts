import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function dbToLinear(db: number) {
  return Math.pow(10, db / 20);
}

export function linearToDb(linear: number) {
  if (linear <= 0) return -100;
  return 20 * Math.log10(linear);
}

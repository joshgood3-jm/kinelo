import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function rankLabel(rank: number): string {
  const labels: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
  return labels[rank] ?? `#${rank}`;
}

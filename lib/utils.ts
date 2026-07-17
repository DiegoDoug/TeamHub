import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Only ever redirect post-login to a same-app relative path. `next` comes
// from a URL query param a user could craft themselves (?next=//evil.com or
// ?next=https://evil.com) and paste in front of someone as a phishing link
// — validating it here closes that open-redirect before router.push sees it.
export function safeNextPath(next: string | null): string {
  if (!next) return "/dashboard"
  if (!next.startsWith("/") || next.startsWith("//")) return "/dashboard"
  return next
}

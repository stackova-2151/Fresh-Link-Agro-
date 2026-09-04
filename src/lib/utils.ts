import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { User } from "@/lib/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Check if user has Entry Approvals permission.
 * MASTER_ADMIN and ADMIN always have access.
 * SUB_ADMIN only has access if permissions includes 'entryApprovals'.
 */
export function hasEntryApprovalsPermission(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.role === 'MASTER_ADMIN') return true;
  if (user.role === 'ADMIN') return true;
  if (user.role === 'SUB_ADMIN') {
    return user.permissions?.includes('entryApprovals') ?? false;
  }
  return false;
}

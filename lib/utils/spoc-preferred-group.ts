/**
 * Client-only preference: which business group a multi-SPOC user is "working as" for
 * profile display, default filters, and pages that read `user.business_unit_group_id` from localStorage.
 * Does not change the account record in the database.
 */

export const LS_SPOC_GROUP_ID = "spocPreferredGroupId"
export const LS_SPOC_GROUP_NAME = "spocPreferredGroupName"

const CHANGED_EVENT = "spoc-active-group-changed"

export function getSpocPreferredFromStorage(): { id: number; name: string } | null {
  if (typeof window === "undefined") return null
  const idRaw = localStorage.getItem(LS_SPOC_GROUP_ID)
  if (!idRaw) return null
  const id = Number(idRaw)
  if (!Number.isFinite(id) || id <= 0) return null
  const name = localStorage.getItem(LS_SPOC_GROUP_NAME) || ""
  return { id, name }
}

export function setSpocPreferredInStorage(id: number, name: string) {
  localStorage.setItem(LS_SPOC_GROUP_ID, String(id))
  localStorage.setItem(LS_SPOC_GROUP_NAME, name)
}

export function clearSpocPreferredFromStorage() {
  localStorage.removeItem(LS_SPOC_GROUP_ID)
  localStorage.removeItem(LS_SPOC_GROUP_NAME)
}

export function dispatchSpocGroupChanged() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(CHANGED_EVENT))
}

export function subscribeSpocGroupChanged(handler: () => void) {
  if (typeof window === "undefined") return () => {}
  window.addEventListener(CHANGED_EVENT, handler)
  return () => window.removeEventListener(CHANGED_EVENT, handler)
}

/** Snapshot of account group from login/API (used when clearing SPOC override). */
export function ensurePrimaryGroupFields<T extends Record<string, unknown>>(user: T | null): T | null {
  if (!user) return user
  const u = user as Record<string, unknown>
  if (u.primary_business_unit_group_id === undefined || u.primary_business_unit_group_id === null) {
    return {
      ...user,
      primary_business_unit_group_id: u.business_unit_group_id ?? null,
      primary_group_name: (u.group_name as string) ?? "",
    } as T
  }
  return user
}

/** Apply stored SPOC workspace preference onto the user object used in the UI. */
export function mergeUserWithSpocPreference<T extends Record<string, unknown>>(user: T | null): T | null {
  if (!user || typeof window === "undefined") return user
  const pref = getSpocPreferredFromStorage()
  if (!pref) return user
  return {
    ...user,
    business_unit_group_id: pref.id,
    group_name: pref.name || (user as { group_name?: string }).group_name,
  } as T
}

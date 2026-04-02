"use client"

import type React from "react"
import { useCallback, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Loader2, Building2 } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { getBusinessUnitGroups } from "@/lib/actions/master-data"
import { updateUserBusinessGroup } from "@/lib/actions/users"
import {
  ensurePrimaryGroupFields,
  mergeUserWithSpocPreference,
  dispatchSpocGroupChanged,
} from "@/lib/utils/spoc-preferred-group"

type GateStatus = "loading" | "ready" | "needs_bu"

/** Account business unit from the server (not SPOC workspace override). */
function accountPrimaryBusinessUnitId(user: Record<string, unknown> | null): number | null {
  if (!user) return null
  const raw =
    user.primary_business_unit_group_id ?? user.business_unit_group_id ?? null
  if (raw == null || raw === "") return null
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
}

function persistUserCookie(user: Record<string, unknown>) {
  if (typeof document === "undefined") return
  document.cookie = `user=${JSON.stringify(user)}; path=/; max-age=86400`
}

export default function PostLoginGroupGate({ children }: { children: React.ReactNode }) {
  const { data: session, status, update } = useSession()
  const [gateStatus, setGateStatus] = useState<GateStatus>("loading")
  const [allGroups, setAllGroups] = useState<{ id: number; name: string }[]>([])
  const [selectedId, setSelectedId] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const runGate = useCallback(async () => {
    if (status === "loading") return

    try {
      let base: Record<string, unknown> | null = null

      if (status === "authenticated" && session?.user) {
        base = {
          id: parseInt(session.user.id || "0", 10),
          email: session.user.email || "",
          full_name: session.user.name || "",
          role: session.user.role || "user",
          business_unit_group_id: session.user.business_unit_group_id ?? null,
          group_name: session.user.group_name ?? "",
        }
      } else {
        const raw = typeof window !== "undefined" ? localStorage.getItem("user") : null
        if (raw) {
          base = JSON.parse(raw) as Record<string, unknown>
        }
      }

      if (!base || !base.id) {
        setGateStatus("ready")
        return
      }

      base = ensurePrimaryGroupFields(base) || base
      const primaryBu = accountPrimaryBusinessUnitId(base)

      if (primaryBu != null) {
        const merged = mergeUserWithSpocPreference(base) || base
        localStorage.setItem("user", JSON.stringify(merged))
        persistUserCookie(merged)
        setGateStatus("ready")
        return
      }

      // New user: no business unit on the account — prompt once to assign
      const bgRes = await getBusinessUnitGroups()
      const rows = (bgRes.success && bgRes.data ? bgRes.data : []) as {
        id: number
        name: string
      }[]
      if (rows.length === 0) {
        toast.error("No business groups are configured. Contact your administrator.")
        setGateStatus("ready")
        return
      }
      setAllGroups(rows)
      setSelectedId("")
      setGateStatus("needs_bu")
    } catch (e) {
      console.error("[PostLoginGroupGate]", e)
      setGateStatus("ready")
    }
  }, [status, session?.user?.id, session?.user?.business_unit_group_id, session?.user?.email])

  useEffect(() => {
    runGate()
  }, [runGate])

  const handleConfirmBu = async () => {
    if (!selectedId) {
      toast.error("Please select a business group")
      return
    }
    const g = allGroups.find((x) => String(x.id) === selectedId)
    if (!g) return

    const raw = localStorage.getItem("user")
    const uid = raw
      ? (JSON.parse(raw) as { id: number }).id
      : session?.user?.id
        ? parseInt(session.user.id, 10)
        : 0
    if (!uid) {
      toast.error("Session error. Please sign in again.")
      return
    }

    setSubmitting(true)
    try {
      const result = await updateUserBusinessGroup(uid, g.id)
      if (!result.success) {
        toast.error(result.error || "Could not save business group")
        return
      }
      const prev = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
      const updated = {
        ...prev,
        business_unit_group_id: g.id,
        group_name: g.name,
        primary_business_unit_group_id: g.id,
        primary_group_name: g.name,
      }
      localStorage.setItem("user", JSON.stringify(updated))
      persistUserCookie(updated)
      await update?.().catch(() => {})
      dispatchSpocGroupChanged()
      setGateStatus("ready")
      toast.success("Business group saved")
    } finally {
      setSubmitting(false)
    }
  }

  if (gateStatus === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-muted-foreground bg-background">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        <p className="text-sm">Loading your workspace…</p>
      </div>
    )
  }

  if (gateStatus === "needs_bu") {
    return (
      <Dialog open onOpenChange={() => {}}>
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-md z-[100]"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary">
              <Building2 className="h-5 w-5" />
              <DialogTitle>Select your business group</DialogTitle>
            </div>
            <DialogDescription>
              Your account does not have a business group yet. Choose one to continue — you need this to raise
              tickets.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <label className="block text-sm font-medium">Business group</label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">— Choose a group —</option>
              {allGroups.map((g) => (
                <option key={g.id} value={String(g.id)}>
                  {g.name}
                </option>
              ))}
            </select>
            <Button
              type="button"
              className="w-full"
              disabled={!selectedId || submitting}
              onClick={() => void handleConfirmBu()}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return <>{children}</>
}

"use client"

import type React from "react"
import HorizontalNav from "./horizontal-nav"
import PostLoginGroupGate from "./post-login-group-gate"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PostLoginGroupGate>
      <div className="w-full" style={{ margin: 0, padding: 0, width: "100%", maxWidth: "100%" }}>
        <HorizontalNav />
        <main className="w-full" style={{ margin: 0, padding: 0, width: "100%", maxWidth: "100%" }}>{children}</main>
      </div>
    </PostLoginGroupGate>
  )
}

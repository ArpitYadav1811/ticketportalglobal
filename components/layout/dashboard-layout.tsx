"use client"

import type React from "react"
import HorizontalNav from "./horizontal-nav"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="w-full" style={{ margin: 0, padding: 0, width: '100%', maxWidth: '100%' }}>
      <HorizontalNav />
      <main className="w-full" style={{ margin: 0, padding: 0, width: '100%', maxWidth: '100%' }}>{children}</main>
    </div>
  )
}

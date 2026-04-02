"use client"

import { useState, useEffect } from "react"
import { signIn } from "next-auth/react"
import Image from "next/image"
import { AlertCircle } from "lucide-react"
import { useTheme } from "next-themes"

// Map NextAuth error codes to user-friendly messages
const errorMessages: Record<string, string> = {
  AccessDenied:
    "Authentication failed. This may be due to a database connection issue. Please try again or contact support if the problem persists.",
  Configuration: "There is a problem with the server configuration. Please contact support.",
  Verification: "The verification token has expired or has already been used.",
  OAuthSignin: "Could not start Microsoft sign-in. Please try again.",
  OAuthCallback: "Microsoft sign-in callback failed. Please try again.",
  OAuthCreateAccount: "Could not create your account from Microsoft profile.",
  Callback: "Sign-in callback failed. Please try again.",
  OAuthAccountNotLinked: "This email is linked with a different sign-in method.",
  SessionRequired: "Please sign in to continue.",
  Signin: "Sign-in failed. Please try again.",
  Default: "An error occurred during sign-in. Please try again.",
}

export function LoginForm() {
  const { setTheme } = useTheme()
  const [error, setError] = useState("")
  const [isSSOLoading, setIsSSOLoading] = useState(false)

  // Force light mode on login page only
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme")
    setTheme("light")

    return () => {
      if (savedTheme && savedTheme !== "light") {
        setTheme(savedTheme)
      }
    }
  }, [setTheme])

  // Check for error in URL query parameters (from NextAuth redirects)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search)
      const errorParam = urlParams.get("error")
      if (errorParam) {
        const errorMessage = errorMessages[errorParam] || errorMessages.Default
        setError(errorMessage)
        urlParams.delete("error")
        const newUrl = window.location.pathname + (urlParams.toString() ? `?${urlParams.toString()}` : "")
        window.history.replaceState({}, "", newUrl)
      }
    }
  }, [])

  const handleMicrosoftSignIn = async () => {
    setError("")
    setIsSSOLoading(true)
    try {
      const callbackUrl = typeof window !== "undefined" ? `${window.location.origin}/dashboard` : "/dashboard"
      // Preferred flow
      await signIn("azure-ad", {
        redirect: true,
        callbackUrl,
      })
    } catch (err) {
      console.error("Microsoft sign-in error:", err)
      // Fallback direct route if NextAuth client helper fails in browser context
      try {
        const callbackUrl = encodeURIComponent("/dashboard")
        window.location.href = `/api/auth/signin/azure-ad?callbackUrl=${callbackUrl}`
        return
      } catch {
        setError("Microsoft sign-in failed. Please try again.")
        setIsSSOLoading(false)
      }
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="overflow-hidden rounded-2xl bg-white shadow-xl border border-slate-200">
        <div className="relative bg-white px-8 pb-8 pt-10">
          <div className="relative flex flex-col items-center gap-3 group">
            <div className=" flex items-center justify-center transition-all duration-300
                            group-hover:scale-105">
              <Image
                src="/mFilterIt_Logo _Login.svg"
                alt="mFilterIt Logo"
                width={160}
                height={60}
                className="object-contain"
              />
            </div>
            <p className="text-sm text-slate-500 text-center mt-2 pb-12">
            Welcome!  Ticket  Portal
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex gap-3 ">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleMicrosoftSignIn}
            disabled={isSSOLoading}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 21 21">
                  <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                  <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                  <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                  <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                </svg>
            <span>{isSSOLoading ? "Signing in..." : "Continue with Microsoft"}</span>
          </button>
          <p className="text-center text-slate-600 dark:text-slate-400 text-xs mt-6 font-medium">
          Your secure gateway to MfilterIt
          </p>
      <p className="text-center text-slate-600 dark:text-slate-400 text-xs mt-6 font-medium border-t border-slate-200 pt-4">
        🔒Protected by enterprise-grade security
      </p>
        </div>
      </div>

    </div>
  )
}

export default LoginForm

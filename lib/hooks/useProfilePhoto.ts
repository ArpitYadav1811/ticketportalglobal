"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"

interface ProfilePhotoData {
  photo: string | null
  loading: boolean
  error: string | null
}

/**
 * Custom hook to fetch and cache user profile photo
 * Handles Microsoft Graph API integration with local storage caching
 */
export function useProfilePhoto(): ProfilePhotoData {
  const { data: session, status } = useSession()
  const [photo, setPhoto] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === "loading") {
      return
    }

    if (!session?.user?.email) {
      setLoading(false)
      return
    }

    const fetchPhoto = async () => {
      try {
        // Check localStorage cache first
        const cacheKey = `profile_photo_${session.user.email}`
        const cacheTimeKey = `profile_photo_time_${session.user.email}`
        const cachedPhoto = localStorage.getItem(cacheKey)
        const cacheTime = localStorage.getItem(cacheTimeKey)

        // Use cached photo if less than 7 days old
        if (cachedPhoto && cacheTime) {
          const daysSinceCache = (Date.now() - parseInt(cacheTime)) / (1000 * 60 * 60 * 24)
          if (daysSinceCache < 7) {
            setPhoto(cachedPhoto)
            setLoading(false)
            return
          }
        }

        // Fetch from API
        const response = await fetch("/api/profile/photo")
        const data = await response.json()

        if (data.photo) {
          setPhoto(data.photo)
          // Cache in localStorage
          localStorage.setItem(cacheKey, data.photo)
          localStorage.setItem(cacheTimeKey, Date.now().toString())
        } else {
          setPhoto(null)
          if (data.error) {
            setError(data.error)
          }
        }
      } catch (err) {
        console.error("Error fetching profile photo:", err)
        setError("Failed to load profile photo")
      } finally {
        setLoading(false)
      }
    }

    fetchPhoto()
  }, [session, status])

  return { photo, loading, error }
}

"use client"

import { useProfilePhoto } from "@/lib/hooks/useProfilePhoto"
import Image from "next/image"

interface UserAvatarProps {
  userName: string
  userEmail?: string
  size?: "sm" | "md" | "lg"
  className?: string
}

/**
 * UserAvatar component that displays user profile photo or initials
 * Automatically fetches photo from Microsoft Graph for SSO users
 */
export function UserAvatar({ 
  userName, 
  userEmail, 
  size = "md", 
  className = "" 
}: UserAvatarProps) {
  const { photo, loading } = useProfilePhoto()

  // Generate initials from name
  const getInitials = (name: string) => {
    const parts = name.trim().split(" ")
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  const initials = getInitials(userName)

  // Size mappings
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
  }

  const sizeClass = sizeClasses[size]

  if (loading) {
    return (
      <div
        className={`${sizeClass} rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse ${className}`}
      />
    )
  }

  if (photo) {
    return (
      <div className={`${sizeClass} rounded-full overflow-hidden ${className}`}>
        <Image
          src={photo}
          alt={userName}
          width={size === "sm" ? 32 : size === "md" ? 40 : 48}
          height={size === "sm" ? 32 : size === "md" ? 40 : 48}
          className="w-full h-full object-cover"
          unoptimized // Since it's a base64 image
        />
      </div>
    )
  }

  // Fallback to initials
  return (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-semibold ${className}`}
    >
      {initials}
    </div>
  )
}

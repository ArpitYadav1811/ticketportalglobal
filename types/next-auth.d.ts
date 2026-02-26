import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      business_unit_group_id?: number
      group_name?: string
      auth_provider?: string
    }
    accessToken?: string
  }

  interface User {
    id: string
    email: string
    name: string
    role?: string
    business_unit_group_id?: number
    group_name?: string
    auth_provider?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    email?: string
    name?: string
    role?: string
    business_unit_group_id?: number | null
    group_name?: string | null
    auth_provider?: string
    accessToken?: string
  }
}

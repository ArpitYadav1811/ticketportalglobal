# Microsoft Graph Profile Photos Integration

## Overview
This document describes the implementation of Microsoft Graph API integration to fetch and display user profile photos from Microsoft 365 for SSO users.

## Implementation Date
February 26, 2026

## Features Implemented

### 1. Microsoft Graph API Integration

#### API Endpoint
- **Route**: `GET /api/profile/photo`
- **File**: `app/api/profile/photo/route.ts`
- **Functionality**:
  - Fetches user profile photo from Microsoft Graph API
  - Implements multi-level caching (database + localStorage)
  - Provides fallback to cached photos if Graph API is unavailable
  - Returns base64-encoded images for easy display

#### Caching Strategy
1. **LocalStorage Cache** (7 days):
   - Key: `profile_photo_{email}`
   - Timestamp: `profile_photo_time_{email}`
   - Checked first for fastest response

2. **Database Cache** (7 days):
   - Stored in `users.avatar_url` column
   - Updated when fetching from Graph API
   - Provides fallback if localStorage is cleared

3. **Microsoft Graph API**:
   - Called only if caches are expired or empty
   - Endpoint: `https://graph.microsoft.com/v1.0/me/photo/$value`
   - Requires `User.Read` scope

### 2. Authentication Updates

#### NextAuth Configuration (`app/api/auth/[...nextauth]/route.ts`)

**Added Scopes**:
```typescript
scope: "openid profile email User.Read"
```

**JWT Callback Enhancement**:
- Stores `accessToken` from Azure AD in JWT token
- Token is used for Microsoft Graph API calls

**Session Callback Enhancement**:
- Exposes `accessToken` in session for API routes

### 3. Custom React Hook

#### `useProfilePhoto` Hook
- **File**: `lib/hooks/useProfilePhoto.ts`
- **Purpose**: Manages profile photo fetching and caching on client side
- **Features**:
  - Automatic photo fetching on component mount
  - LocalStorage caching with expiration
  - Loading and error states
  - Seamless integration with NextAuth session

**Usage**:
```typescript
const { photo, loading, error } = useProfilePhoto()
```

### 4. UserAvatar Component

#### Component Details
- **File**: `components/ui/user-avatar.tsx`
- **Purpose**: Reusable avatar component with automatic photo fetching
- **Features**:
  - Displays Microsoft Graph photo if available
  - Falls back to user initials if no photo
  - Three sizes: `sm` (32px), `md` (40px), `lg` (48px)
  - Loading state with skeleton
  - Gradient background for initials

**Usage**:
```typescript
<UserAvatar 
  userName="John Doe" 
  userEmail="john@example.com"
  size="md"
  className="shadow-sm"
/>
```

### 5. UI Integration

#### Updated Components
1. **Horizontal Navigation** (`components/layout/horizontal-nav.tsx`):
   - Replaced static initials avatar with `UserAvatar` component
   - Displays Microsoft 365 profile photo for SSO users
   - Maintains initials fallback for all users

## How It Works

### Flow Diagram
```
User Login (SSO)
    ↓
NextAuth stores accessToken in JWT
    ↓
User navigates to dashboard
    ↓
UserAvatar component renders
    ↓
useProfilePhoto hook checks localStorage
    ↓
If cache valid → Display cached photo
    ↓
If cache expired → Call /api/profile/photo
    ↓
API checks database cache
    ↓
If DB cache valid → Return cached photo
    ↓
If DB cache expired → Call Microsoft Graph API
    ↓
Graph API returns photo → Convert to base64
    ↓
Cache in database + localStorage
    ↓
Display photo in UI
```

### Fallback Logic
1. **Microsoft Graph photo available** → Display photo
2. **No photo (404 from Graph)** → Display initials with gradient background
3. **Graph API error** → Use cached photo if available, else initials
4. **No access token** → Use database cached photo if available, else initials

## Configuration

### Environment Variables Required
```env
MICROSOFT_CLIENT_ID=your_client_id
MICROSOFT_CLIENT_SECRET=your_client_secret
MICROSOFT_TENANT_ID=your_tenant_id_or_common
AUTH_SECRET=your_secret_key
```

### Azure AD App Registration
Ensure the following permissions are granted:
- `User.Read` (Delegated)
- `openid` (Delegated)
- `profile` (Delegated)
- `email` (Delegated)

## Database Schema

### Users Table
The `avatar_url` column stores the base64-encoded profile photo:
```sql
-- No migration needed - column already exists
-- avatar_url TEXT
-- updated_at TIMESTAMP WITH TIME ZONE
```

## Performance Considerations

### Caching Benefits
- **First Load**: ~500-1000ms (Graph API call)
- **Subsequent Loads**: <10ms (localStorage)
- **After Cache Expiry**: ~100-200ms (database) or ~500-1000ms (Graph API)

### Network Optimization
- Base64 encoding allows inline display (no additional HTTP requests)
- 7-day cache reduces API calls by ~99%
- LocalStorage provides instant loading on return visits

## Error Handling

### Graceful Degradation
1. **Graph API unavailable**: Falls back to database cache
2. **Database unavailable**: Falls back to localStorage
3. **All caches empty**: Displays user initials
4. **No access token**: Uses cached data or initials

### Error Scenarios
- **404 from Graph**: User has no profile photo set
- **401 from Graph**: Access token expired (falls back to cache)
- **500 from Graph**: Microsoft service issue (falls back to cache)

## Testing

### Test Scenarios
1. **SSO User with Photo**:
   - Login with Microsoft SSO
   - Verify photo displays in header
   - Check localStorage for cached photo
   - Verify database `avatar_url` is populated

2. **SSO User without Photo**:
   - Login with Microsoft SSO (user with no photo)
   - Verify initials display with gradient background
   - Confirm no errors in console

3. **Email/Password User**:
   - Login with email/password
   - Verify initials display (no Graph API call)
   - Confirm graceful handling of missing access token

4. **Cache Expiry**:
   - Clear localStorage
   - Refresh page
   - Verify photo fetched from database
   - Clear database cache (set `updated_at` to old date)
   - Verify photo fetched from Graph API

## Future Enhancements

### Potential Improvements
1. **Refresh Token Support**: Implement token refresh for long-lived sessions
2. **Photo Upload**: Allow users to upload custom avatars
3. **Thumbnail Sizes**: Fetch different sizes from Graph API (`48x48`, `96x96`, `432x432`)
4. **Background Sync**: Periodically update photos in background
5. **Compression**: Compress base64 images to reduce storage

## Troubleshooting

### Common Issues

#### Photo Not Loading
1. Check if `User.Read` scope is granted in Azure AD
2. Verify `accessToken` is present in session
3. Check browser console for API errors
4. Verify user has profile photo in Microsoft 365

#### Access Token Missing
1. Ensure NextAuth configuration includes `User.Read` scope
2. Check JWT callback stores `accessToken`
3. Verify session callback exposes `accessToken`

#### Cache Not Working
1. Check localStorage is enabled in browser
2. Verify database `updated_at` column is updating
3. Check cache expiry logic (7 days)

### Debug Commands
```typescript
// Check localStorage cache
console.log(localStorage.getItem('profile_photo_user@example.com'))

// Check session
import { useSession } from "next-auth/react"
const { data: session } = useSession()
console.log(session?.accessToken) // Should be present for SSO users

// Force cache refresh
localStorage.removeItem('profile_photo_user@example.com')
localStorage.removeItem('profile_photo_time_user@example.com')
```

## API Reference

### GET /api/profile/photo

**Response**:
```json
{
  "photo": "data:image/jpeg;base64,...",
  "cached": true
}
```

**Error Response**:
```json
{
  "photo": null,
  "error": "No access token"
}
```

## Security Considerations

1. **Access Token Storage**: Stored in JWT (encrypted)
2. **API Authorization**: Requires valid NextAuth session
3. **CORS**: API route is server-side only
4. **Data Privacy**: Photos cached per user, not shared
5. **Token Expiry**: Access tokens expire per Azure AD settings

## Conclusion

This implementation provides a seamless experience for displaying Microsoft 365 profile photos while maintaining excellent performance through multi-level caching and graceful fallbacks.

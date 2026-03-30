# Architecture Flow Diagrams

## Current Flow (Before Migration)

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERACTION                         │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                  components/auth/login-form.tsx                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  - useState for email, password, loading, error           │ │
│  │  - handleSubmit with fetch("/api/auth/login")            │ │
│  │  - Manual loading state (setIsLoading)                    │ │
│  │  - Manual error handling (try/catch)                      │ │
│  │  - Manual success handling (localStorage, routing)        │ │
│  │  - 274 lines of mixed UI + logic                          │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                  │
                      fetch("/api/auth/login", {...})
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│               app/api/auth/login/route.ts                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  export async function POST(request) {                    │ │
│  │    const { email, password } = await request.json()       │ │
│  │    const result = await loginUser(email, password)        │ │
│  │    return NextResponse.json({ user: result.user })        │ │
│  │  }                                                          │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                  │
                    loginUser(email, password)
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                  lib/actions/auth.ts                             │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  "use server"                                              │ │
│  │  export async function loginUser(email, password) {       │ │
│  │    // Validation                                           │ │
│  │    const result = await sql`SELECT ... FROM users`        │ │
│  │    // Password check                                       │ │
│  │    return { success: true, user }                         │ │
│  │  }                                                          │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                  │
                         sql`SELECT ...`
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      lib/db.ts (Neon Client)                     │
│                         PostgreSQL Database                       │
└─────────────────────────────────────────────────────────────────┘

Problems:
❌ Component has mixed concerns (UI + API + state)
❌ No caching (refetch every time)
❌ Manual loading/error states everywhere
❌ Can't reuse login logic elsewhere
❌ Hard to test (must mock fetch)
```

---

## Proposed Flow (After Migration)

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERACTION                         │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│           src/modules/auth/components/LoginForm.tsx              │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  LAYER 3: UI ONLY                                          │ │
│  │  - useState for email, password (user input only)         │ │
│  │  - const loginMutation = useLoginMutation()               │ │
│  │  - loginMutation.mutateAsync({ email, password })        │ │
│  │  - Use loginMutation.isPending for loading                │ │
│  │  - ~100 lines of pure UI                                  │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                  │
                    useLoginMutation()
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│          src/modules/auth/hooks/useLoginMutation.ts              │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  LAYER 2: STATE MANAGEMENT                                 │ │
│  │  export function useLoginMutation() {                      │ │
│  │    return useMutation({                                    │ │
│  │      mutationFn: loginHandler,  ← calls handler           │ │
│  │      onSuccess: (data) => {                                │ │
│  │        localStorage.setItem("user", ...)                   │ │
│  │        queryClient.invalidateQueries(...)                  │ │
│  │        router.push("/dashboard")                           │ │
│  │      }                                                      │ │
│  │    })                                                       │ │
│  │  }                                                          │ │
│  │  - Auto loading state (isPending)                          │ │
│  │  - Auto error state (error)                                │ │
│  │  - Auto retry logic                                        │ │
│  │  - Cache invalidation                                      │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                  │
                      loginHandler(payload)
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│            src/api/handlers/auth.handler.ts                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  LAYER 1: API LOGIC                                        │ │
│  │  export async function loginHandler(payload) {            │ │
│  │    const response = await apiClient.post(               │ │
│  │      endpoints.auth.login,                                 │ │
│  │      payload                                                │ │
│  │    )                                                        │ │
│  │    return response.data                                    │ │
│  │  }                                                          │ │
│  │  - Pure function (easy to test)                           │ │
│  │  - Reusable anywhere                                       │ │
│  │  - Type-safe                                               │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                  │
                apiClient.post(endpoints.auth.login, ...)
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                     src/api/client.ts                            │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Axios Instance + Interceptors                            │ │
│  │  - Request interceptor: add auth headers                  │ │
│  │  - Response interceptor: handle 401, errors               │ │
│  │  - Global timeout configuration                            │ │
│  │  - Global error handling                                   │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                  │
                    POST /api/auth/login
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│               app/api/auth/login/route.ts                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  (Same as before - no changes needed)                     │ │
│  │  export async function POST(request) {                    │ │
│  │    const { email, password } = await request.json()       │ │
│  │    const result = await loginUser(email, password)        │ │
│  │    return NextResponse.json({ user: result.user })        │ │
│  │  }                                                          │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                  │
                    loginUser(email, password)
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                  lib/actions/auth.ts                             │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  (Same as before - no changes needed)                     │ │
│  │  "use server"                                              │ │
│  │  export async function loginUser(email, password) {       │ │
│  │    const result = await sql`SELECT ... FROM users`        │ │
│  │    return { success: true, user }                         │ │
│  │  }                                                          │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                  │
                         sql`SELECT ...`
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      lib/db.ts (Neon Client)                     │
│                         PostgreSQL Database                       │
└─────────────────────────────────────────────────────────────────┘

Benefits:
✅ Clear separation of concerns (3 layers)
✅ Automatic caching (React Query)
✅ Auto loading/error states
✅ Reusable handlers
✅ Easy to test (mock each layer)
✅ Global error handling (interceptors)
```

---

## Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          LAYER 3: UI                             │
│                         (Components)                             │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  src/modules/{feature}/components/*.tsx                   │ │
│  │                                                              │ │
│  │  Responsibilities:                                          │ │
│  │  - Render UI                                                │ │
│  │  - Handle user input (forms)                                │ │
│  │  - Display loading/error/success states                     │ │
│  │  - NO API calls                                             │ │
│  │  - NO business logic                                        │ │
│  │                                                              │ │
│  │  Example:                                                   │ │
│  │    const { data, isLoading } = useTickets()                │ │
│  │    if (isLoading) return <Spinner />                        │ │
│  │    return <TicketTable tickets={data.tickets} />           │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                  │
                           Uses hooks from ↓
┌─────────────────────────────────────────────────────────────────┐
│                   LAYER 2: STATE MANAGEMENT                      │
│                      (React Query Hooks)                         │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  src/modules/{feature}/hooks/*.ts                          │ │
│  │                                                              │ │
│  │  Responsibilities:                                          │ │
│  │  - Manage server state (React Query)                        │ │
│  │  - Handle caching, refetching                               │ │
│  │  - Manage side effects (onSuccess, onError)                 │ │
│  │  - Call handlers                                            │ │
│  │  - NO direct API calls                                      │ │
│  │  - NO UI code                                               │ │
│  │                                                              │ │
│  │  Example:                                                   │ │
│  │    export function useTickets(filters) {                   │ │
│  │      return useQuery({                                      │ │
│  │        queryKey: ["tickets", filters],                     │ │
│  │        queryFn: () => getTicketsHandler(filters)           │ │
│  │      })                                                      │ │
│  │    }                                                         │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                  │
                          Calls handlers from ↓
┌─────────────────────────────────────────────────────────────────┐
│                      LAYER 1: DATA ACCESS                        │
│                          (Handlers)                              │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  src/api/handlers/*.handler.ts                             │ │
│  │                                                              │ │
│  │  Responsibilities:                                          │ │
│  │  - Make API calls (via apiClient)                           │ │
│  │  - Transform request/response data                          │ │
│  │  - Pure functions (no React, no side effects)               │ │
│  │  - Reusable anywhere (client/server)                        │ │
│  │  - NO state management                                      │ │
│  │  - NO UI code                                               │ │
│  │                                                              │ │
│  │  Example:                                                   │ │
│  │    export async function getTicketsHandler(filters) {      │ │
│  │      const response = await apiClient.get(                 │ │
│  │        endpoints.tickets.list,                              │ │
│  │        { params: filters }                                  │ │
│  │      )                                                       │ │
│  │      return response.data                                   │ │
│  │    }                                                         │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                  │
                         Uses apiClient from ↓
┌─────────────────────────────────────────────────────────────────┐
│                   INFRASTRUCTURE: API CLIENT                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  src/api/client.ts + src/api/endpoints.ts                  │ │
│  │                                                              │ │
│  │  Responsibilities:                                          │ │
│  │  - Axios instance configuration                             │ │
│  │  - Request/Response interceptors                            │ │
│  │  - Auth token injection                                     │ │
│  │  - Global error handling                                    │ │
│  │  - Endpoint URL management                                  │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Module Structure Example: Tickets

```
src/modules/tickets/
│
├── hooks/                          ← LAYER 2: State Management
│   ├── useTickets.ts               → useQuery for list
│   ├── useTicket.ts                → useQuery for single ticket
│   ├── useCreateTicket.ts          → useMutation for create
│   ├── useUpdateTicket.ts          → useMutation for update
│   ├── useDeleteTicket.ts          → useMutation for delete
│   └── index.ts                    → Export all hooks
│
├── components/                      ← LAYER 3: UI
│   ├── TicketList.tsx              → Table/list view
│   ├── TicketCard.tsx              → Single ticket card
│   ├── TicketForm.tsx              → Create/edit form
│   ├── TicketDetails.tsx           → Detail view
│   ├── TicketFilters.tsx           → Filter sidebar
│   └── index.ts                    → Export all components
│
└── types.ts                         → Module-specific types (optional)
    └── TicketFormValues, etc.
```

**Usage in page:**

```typescript
// app/tickets/page.tsx
import { TicketList } from "@/src/modules/tickets/components"

export default function TicketsPage() {
  return <TicketList />
}
```

**Component uses hook:**

```typescript
// src/modules/tickets/components/TicketList.tsx
import { useTickets } from "../hooks"

export function TicketList() {
  const { data, isLoading } = useTickets()  // ← Hook provides data
  
  if (isLoading) return <LoadingSpinner />
  
  return (
    <div>
      {data?.tickets.map(ticket => (
        <TicketCard key={ticket.id} ticket={ticket} />
      ))}
    </div>
  )
}
```

**Hook uses handler:**

```typescript
// src/modules/tickets/hooks/useTickets.ts
import { getTicketsHandler } from "@/src/api/handlers/tickets.handler"

export function useTickets(filters) {
  return useQuery({
    queryKey: ["tickets", filters],
    queryFn: () => getTicketsHandler(filters)  // ← Handler fetches data
  })
}
```

**Handler calls API:**

```typescript
// src/api/handlers/tickets.handler.ts
import { apiClient } from "../client"
import { endpoints } from "../endpoints"

export async function getTicketsHandler(filters) {
  const response = await apiClient.get(endpoints.tickets.list, {
    params: filters
  })
  return response.data
}
```

---

## Data Flow: Create Ticket Example

```
User fills form and clicks "Create"
          ↓
┌─────────────────────────────────────────┐
│  TicketForm.tsx (UI)                    │
│  const createTicket = useCreateTicket() │
│  createTicket.mutate(formData)          │
└─────────────────────────────────────────┘
          ↓
┌──────────────────────────────────────────────┐
│  useCreateTicket.ts (Hook)                   │
│  useMutation({                               │
│    mutationFn: createTicketHandler,         │
│    onSuccess: (newTicket) => {              │
│      invalidate tickets list                │
│      navigate to ticket detail              │
│    }                                         │
│  })                                          │
└──────────────────────────────────────────────┘
          ↓
┌──────────────────────────────────────────────┐
│  createTicketHandler (Handler)               │
│  apiClient.post(                            │
│    endpoints.tickets.create,                │
│    payload                                   │
│  )                                           │
└──────────────────────────────────────────────┘
          ↓
┌──────────────────────────────────────────────┐
│  apiClient (Axios + Interceptors)            │
│  - Add auth headers                          │
│  - POST /api/tickets                        │
│  - Handle errors globally                    │
└──────────────────────────────────────────────┘
          ↓
┌──────────────────────────────────────────────┐
│  app/api/tickets/route.ts (API Route)        │
│  - Validate request                          │
│  - Call createTicket server action          │
│  - Return response                           │
└──────────────────────────────────────────────┘
          ↓
┌──────────────────────────────────────────────┐
│  lib/actions/tickets.ts (Server Action)      │
│  - Business logic                            │
│  - Database insert                           │
│  - Return created ticket                     │
└──────────────────────────────────────────────┘
          ↓
Response flows back up through all layers
          ↓
React Query auto-updates cache
          ↓
Component re-renders with new data
          ↓
User sees new ticket in list (instant!)
```

---

## Comparison: Adding a New Feature

### Before (Current Architecture)

**Task:** Add "Archive Ticket" feature

```
Step 1: Create API route
  → app/api/tickets/[id]/archive/route.ts
  → Write POST handler
  → Call server action

Step 2: Create server action
  → lib/actions/tickets.ts
  → Add archiveTicket function
  → Write SQL UPDATE query

Step 3: Update component
  → components/tickets/ticket-details.tsx
  → Add useState for loading/error
  → Add handleArchive function
  → Add fetch("/api/tickets/123/archive")
  → Add try/catch error handling
  → Add loading state
  → Add success notification
  → Add cache invalidation (manual refetch)

Step 4: Add UI button
  → Add Archive button
  → Disable during loading
  → Show error if fails

Total: 4 files, ~150 lines of code
Time: ~2 hours
Mistakes: Easy (forget error handling, loading state, cache invalidation)
```

### After (New Architecture)

**Task:** Add "Archive Ticket" feature

```
Step 1: Add endpoint
  → src/api/endpoints.ts
  → Add: archive: (id) => `/api/tickets/${id}/archive`

Step 2: Add handler
  → src/api/handlers/tickets.handler.ts
  → export async function archiveTicketHandler(id) {
      return await apiClient.post(endpoints.tickets.archive(id))
    }

Step 3: Add hook
  → src/modules/tickets/hooks/useArchiveTicket.ts
  → export function useArchiveTicket(id) {
      return useMutation({
        mutationFn: () => archiveTicketHandler(id),
        onSuccess: () => {
          queryClient.invalidateQueries(["tickets"])
        }
      })
    }

Step 4: Update component
  → src/modules/tickets/components/TicketDetails.tsx
  → const archiveTicket = useArchiveTicket(ticket.id)
  → <Button onClick={() => archiveTicket.mutate()}>
      Archive
    </Button>

Total: 4 files, ~30 lines of code
Time: ~30 minutes
Mistakes: Hard (React Query handles loading/error/cache)
```

**Benefits:**
- ✅ 80% less code
- ✅ 75% less time
- ✅ Fewer mistakes (automatic handling)
- ✅ Consistent pattern
- ✅ Easy to test

---

## Testing Strategy

### Component Testing (UI Layer)

```typescript
// src/modules/tickets/components/TicketList.test.tsx
import { render, screen } from "@testing-library/react"
import { TicketList } from "./TicketList"
import { useTickets } from "../hooks"

// Mock the hook (don't test API)
jest.mock("../hooks", () => ({
  useTickets: jest.fn()
}))

test("shows loading spinner", () => {
  useTickets.mockReturnValue({
    data: null,
    isLoading: true
  })
  
  render(<TicketList />)
  expect(screen.getByText("Loading...")).toBeInTheDocument()
})

test("shows tickets when loaded", () => {
  useTickets.mockReturnValue({
    data: { tickets: [{ id: 1, title: "Test Ticket" }] },
    isLoading: false
  })
  
  render(<TicketList />)
  expect(screen.getByText("Test Ticket")).toBeInTheDocument()
})
```

### Hook Testing (State Layer)

```typescript
// src/modules/tickets/hooks/useTickets.test.ts
import { renderHook } from "@testing-library/react-hooks"
import { useTickets } from "./useTickets"
import { getTicketsHandler } from "@/src/api/handlers/tickets.handler"

// Mock the handler (don't test API)
jest.mock("@/src/api/handlers/tickets.handler")

test("fetches tickets", async () => {
  getTicketsHandler.mockResolvedValue({
    tickets: [{ id: 1, title: "Test" }]
  })
  
  const { result, waitFor } = renderHook(() => useTickets())
  
  await waitFor(() => result.current.isSuccess)
  
  expect(result.current.data.tickets).toHaveLength(1)
})
```

### Handler Testing (Data Layer)

```typescript
// src/api/handlers/tickets.handler.test.ts
import { getTicketsHandler } from "./tickets.handler"
import { apiClient } from "../client"

// Mock axios
jest.mock("../client")

test("calls correct endpoint", async () => {
  apiClient.get.mockResolvedValue({
    data: { tickets: [] }
  })
  
  await getTicketsHandler({ status: "open" })
  
  expect(apiClient.get).toHaveBeenCalledWith(
    "/api/tickets",
    { params: { status: "open" } }
  )
})
```

**Benefits:**
- ✅ Each layer tested independently
- ✅ Easy to mock
- ✅ Fast tests (no real API calls)
- ✅ Clear responsibilities

---

## Summary

### Current Architecture: Single Layer (Mixed)

```
Component
  ↓ (contains everything)
API Call + State + UI
  ↓
API Route → Server Action → Database
```

**Problems:** Mixed concerns, hard to test, not reusable

---

### New Architecture: Three Layers (Separated)

```
Component (UI)
  ↓ (uses)
Hook (State)
  ↓ (calls)
Handler (API)
  ↓ (through)
API Client → API Route → Server Action → Database
```

**Benefits:** Clear separation, easy to test, highly reusable

---

**The new architecture provides the same functionality with better organization, less code, and improved developer experience.**

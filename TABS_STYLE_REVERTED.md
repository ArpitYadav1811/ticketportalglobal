# User Settings Tabs - Style Reverted ✅

## Change Made
Reverted the User Settings page tabs to use the same style as the Tickets page (default rounded tabs instead of underline style).

## Before (Underline Style)
```tsx
<TabsList className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 rounded-none p-0 h-auto w-full justify-start">
  <TabsTrigger 
    value="my-team"
    className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-transparent px-6 py-3 font-medium text-sm"
  >
    My Team
  </TabsTrigger>
  <TabsTrigger 
    value="business-group"
    className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-transparent px-6 py-3 font-medium text-sm"
  >
    Business Group
  </TabsTrigger>
</TabsList>
```

## After (Default Rounded Style - Same as Tickets Page)
```tsx
<TabsList className="mb-4">
  <TabsTrigger value="my-team">My Team</TabsTrigger>
  <TabsTrigger value="business-group">Business Group</TabsTrigger>
</TabsList>
```

## Result
- User Settings tabs now match the Tickets page style
- Default rounded tab buttons with background color on active state
- Simpler, cleaner code
- Consistent tab styling across the application

## File Modified
- `app/settings/page.tsx`

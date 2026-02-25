# CustomTooltip Implementation Example

## Quick Start Example

Here's a complete example showing how to add CustomTooltip to the Title column:

### Before (Current Code):
```tsx
<td className="px-4 py-4">
  <div className="max-w-xs">
    <p className="font-semibold text-slate-900 dark:text-white text-sm truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer" title={ticket.title}>
      {ticket.title}
    </p>
    {ticket.category_name && (
      <div className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5">
        {ticket.category_name}
        {ticket.subcategory_name && ` > ${ticket.subcategory_name}`}
      </div>
    )}
  </div>
</td>
```

### After (With CustomTooltip):
```tsx
<td className="px-4 py-4">
  <div className="max-w-xs">
    <CustomTooltip 
      content={
        <div>
          <div className="font-semibold mb-2">{ticket.title}</div>
          {ticket.category_name && (
            <div className="text-xs opacity-80 border-t border-gray-600 pt-2 mt-2">
              <div>Category: {ticket.category_name}</div>
              {ticket.subcategory_name && (
                <div>Subcategory: {ticket.subcategory_name}</div>
              )}
            </div>
          )}
          {ticket.description && (
            <div className="text-xs opacity-80 border-t border-gray-600 pt-2 mt-2">
              <div className="font-medium mb-1">Description:</div>
              <div className="max-w-md">{ticket.description}</div>
            </div>
          )}
        </div>
      }
      position="top"
      maxLength={300}
      showMoreButton={true}
    >
      <p className="font-semibold text-slate-900 dark:text-white text-sm truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer">
        {ticket.title}
      </p>
    </CustomTooltip>
    {ticket.category_name && (
      <div className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5 truncate">
        {ticket.category_name}
        {ticket.subcategory_name && ` > ${ticket.subcategory_name}`}
      </div>
    )}
  </div>
</td>
```

---

## What Changed?

1. **Wrapped with CustomTooltip**: The title `<p>` tag is now wrapped
2. **Rich Content**: Tooltip shows title, category, subcategory, and description
3. **Formatted**: Uses dividers and sections for clarity
4. **Expandable**: Long descriptions can be expanded with "Show More" button
5. **Positioned**: Tooltip appears on top
6. **Cursor**: Added cursor-pointer to indicate interactivity

---

## Visual Result

### On Hover:
```
┌─────────────────────────────────────┐
│ Fix login authentication bug        │
│                                     │
│ ─────────────────────────────────  │
│ Category: Technical Support         │
│ Subcategory: Authentication         │
│                                     │
│ ─────────────────────────────────  │
│ Description:                        │
│ Users are unable to login using     │
│ their credentials. The system...    │
│                                     │
│ ▼ Show More                         │
└─────────────────────────────────────┘
        ▼ (arrow pointing to element)
```

---

## Simple Example (Just Text):

For simpler columns like Target Business Group:

```tsx
<td className="px-4 py-4">
  <CustomTooltip content={ticket.target_business_group_name || "N/A"} position="top">
    <div className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-[150px] cursor-pointer hover:text-blue-600 transition-colors">
      {ticket.target_business_group_name || "N/A"}
    </div>
  </CustomTooltip>
</td>
```

---

## User Avatar Example:

For columns with avatars (Creator/Assignee):

```tsx
<td className="px-4 py-4">
  <CustomTooltip 
    content={
      <div>
        <div className="font-semibold text-base mb-2">{ticket.creator_name || "N/A"}</div>
        {ticket.initiator_group_name && (
          <div className="text-xs opacity-80">
            <div className="flex items-center gap-2">
              <span className="font-medium">Group:</span>
              <span>{ticket.initiator_group_name}</span>
            </div>
          </div>
        )}
        {ticket.email && (
          <div className="text-xs opacity-80 mt-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">Email:</span>
              <span>{ticket.email}</span>
            </div>
          </div>
        )}
      </div>
    }
    position="top"
  >
    <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs shadow-sm">
        {ticket.creator_name ? ticket.creator_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "NA"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{ticket.creator_name || "N/A"}</p>
        <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{ticket.initiator_group_name || ""}</p>
      </div>
    </div>
  </CustomTooltip>
</td>
```

---

## Date Example with Full Timestamp:

```tsx
<td className="px-4 py-4">
  <CustomTooltip 
    content={
      <div>
        <div className="font-semibold mb-1">Created</div>
        <div className="text-sm">{format(new Date(ticket.created_at), "EEEE, MMMM dd, yyyy")}</div>
        <div className="text-sm">{format(new Date(ticket.created_at), "hh:mm:ss a")}</div>
      </div>
    }
    position="top"
  >
    <div className="flex flex-col cursor-pointer hover:opacity-80 transition-opacity">
      <span className="text-sm font-semibold text-slate-900 dark:text-white">
        {format(new Date(ticket.created_at), "dd MMM yyyy")}
      </span>
      <span className="text-xs text-slate-600 dark:text-slate-400">
        {format(new Date(ticket.created_at), "HH:mm")}
      </span>
    </div>
  </CustomTooltip>
</td>
```

---

## Tips for Implementation

### 1. Always Add cursor-pointer
```tsx
<div className="... cursor-pointer">
```

### 2. Add Hover Effects
```tsx
<div className="... hover:text-blue-600 hover:opacity-80 transition-colors">
```

### 3. Use truncate for Text
```tsx
<p className="... truncate">
```

### 4. Set max-w for Containers
```tsx
<div className="max-w-xs"> or <div className="max-w-[150px]">
```

### 5. Use min-w-0 flex-1 for Flex Children
```tsx
<div className="min-w-0 flex-1">
  <p className="truncate">...</p>
</div>
```

### 6. Format Rich Content
```tsx
content={
  <div>
    <div className="font-semibold mb-2">Title</div>
    <div className="text-xs opacity-80 border-t border-gray-600 pt-2 mt-2">
      Additional info
    </div>
  </div>
}
```

### 7. Choose Right Position
- Top columns: `position="top"`
- Bottom columns: `position="bottom"`
- Left columns: `position="right"`
- Right columns: `position="left"`

---

## Testing

After implementation, test:

1. ✅ Hover shows tooltip
2. ✅ Tooltip stays in viewport
3. ✅ Long content shows "Show More" button
4. ✅ Clicking "Show More" expands content
5. ✅ Tooltip disappears when mouse leaves
6. ✅ Works in dark mode
7. ✅ Tooltip arrow points to element
8. ✅ Multiple tooltips don't overlap

---

## Result

Your table will now have professional tooltips that:
- Show full content on hover
- Display rich formatted information
- Stay within viewport boundaries
- Support dark mode
- Have smooth animations
- Provide excellent UX

Happy implementing! 🎉

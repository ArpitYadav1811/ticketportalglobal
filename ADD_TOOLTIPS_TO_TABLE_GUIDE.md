# Adding Custom Tooltips to Tickets Table - Implementation Guide

## Overview
This guide shows how to wrap truncated columns with CustomTooltip to show full text on hover.

---

## Step 1: Import CustomTooltip (✅ Already Done)

The import has been added:
```typescript
import CustomTooltip from "@/components/ui/custom-tooltip"
```

---

## Step 2: Wrap Ticket ID Column

### Find this code:
```tsx
<td className="px-4 py-4">
  <button
    onClick={() => router.push(`/tickets/${ticket.id}`)}
    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-100 dark:border-blue-900 rounded-lg text-blue-700 dark:text-blue-400 font-bold text-sm hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-200 hover:scale-105"
  >
    {ticket.ticket_id}
  </button>
</td>
```

### Replace with:
```tsx
<td className="px-4 py-4">
  <CustomTooltip content={`Ticket ID: ${ticket.ticket_id}`} position="top">
    <button
      onClick={() => router.push(`/tickets/${ticket.id}`)}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-100 dark:border-blue-900 rounded-lg text-blue-700 dark:text-blue-400 font-bold text-sm hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-200 hover:scale-105"
    >
      {ticket.ticket_id}
    </button>
  </CustomTooltip>
</td>
```

---

## Step 3: Wrap Title Column

### Find this code:
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

### Replace with:
```tsx
<td className="px-4 py-4">
  <div className="max-w-xs">
    <CustomTooltip 
      content={
        <div>
          <div className="font-semibold mb-1">{ticket.title}</div>
          {ticket.category_name && (
            <div className="text-xs opacity-80">
              Category: {ticket.category_name}
              {ticket.subcategory_name && ` > ${ticket.subcategory_name}`}
            </div>
          )}
        </div>
      }
      position="top"
      maxLength={150}
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

## Step 4: Wrap Creator Column

### Find this code:
```tsx
<td className="px-4 py-4">
  <div className="flex items-center gap-2">
    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs">
      {ticket.creator_name ? ticket.creator_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "NA"}
    </div>
    <div>
      <p className="text-sm font-semibold text-slate-900 dark:text-white">{ticket.creator_name || "N/A"}</p>
      <p className="text-xs text-slate-600 dark:text-slate-400">{ticket.initiator_group_name || ""}</p>
    </div>
  </div>
</td>
```

### Replace with:
```tsx
<td className="px-4 py-4">
  <CustomTooltip 
    content={
      <div>
        <div className="font-semibold">{ticket.creator_name || "N/A"}</div>
        {ticket.initiator_group_name && (
          <div className="text-xs opacity-80 mt-1">Group: {ticket.initiator_group_name}</div>
        )}
      </div>
    }
    position="top"
  >
    <div className="flex items-center gap-2 cursor-pointer">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs">
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

## Step 5: Wrap Assignee Column

### Find this code:
```tsx
<td className="px-4 py-4">
  <div className="flex items-center gap-2">
    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xs">
      {ticket.assignee_name ? ticket.assignee_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "UN"}
    </div>
    <div>
      <p className="text-sm font-semibold text-slate-900 dark:text-white">{ticket.assignee_name || "Unassigned"}</p>
      <p className="text-xs text-slate-600 dark:text-slate-400">{ticket.assignee_group_name || ""}</p>
    </div>
  </div>
</td>
```

### Replace with:
```tsx
<td className="px-4 py-4">
  <CustomTooltip 
    content={
      <div>
        <div className="font-semibold">{ticket.assignee_name || "Unassigned"}</div>
        {ticket.assignee_group_name && (
          <div className="text-xs opacity-80 mt-1">Group: {ticket.assignee_group_name}</div>
        )}
      </div>
    }
    position="top"
  >
    <div className="flex items-center gap-2 cursor-pointer">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xs">
        {ticket.assignee_name ? ticket.assignee_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "UN"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{ticket.assignee_name || "Unassigned"}</p>
        <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{ticket.assignee_group_name || ""}</p>
      </div>
    </div>
  </CustomTooltip>
</td>
```

---

## Step 6: Wrap Target Business Group Column

### Find this code:
```tsx
<td className="px-4 py-4 text-sm font-medium text-slate-900 dark:text-white">
  {ticket.target_business_group_name || "N/A"}
</td>
```

### Replace with:
```tsx
<td className="px-4 py-4">
  <CustomTooltip content={ticket.target_business_group_name || "N/A"} position="top">
    <div className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-[150px] cursor-pointer">
      {ticket.target_business_group_name || "N/A"}
    </div>
  </CustomTooltip>
</td>
```

---

## Step 7: Wrap Date Column

### Find this code:
```tsx
<td className="px-4 py-4">
  <div className="flex flex-col">
    <span className="text-sm font-semibold text-slate-900 dark:text-white">
      {format(new Date(ticket.created_at), "dd MMM yyyy")}
    </span>
    <span className="text-xs text-slate-600 dark:text-slate-400">
      {format(new Date(ticket.created_at), "HH:mm")}
    </span>
  </div>
</td>
```

### Replace with:
```tsx
<td className="px-4 py-4">
  <CustomTooltip 
    content={format(new Date(ticket.created_at), "dd MMM yyyy 'at' HH:mm:ss")}
    position="top"
  >
    <div className="flex flex-col cursor-pointer">
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

## Step 8: Wrap Status Column (for display mode)

### Find this code (in the else branch of status select):
```tsx
<span className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border-2 shadow-sm transition-all duration-200 hover:shadow-md ${statusColor[ticket.status] || statusColor["open"]}`}>
  {ticket.status === "on-hold" ? "On-Hold" : ticket.status === "deleted" ? "Deleted" : ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
</span>
```

### Replace with:
```tsx
<CustomTooltip content={`Status: ${ticket.status === "on-hold" ? "On-Hold" : ticket.status === "deleted" ? "Deleted" : ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}`} position="top">
  <span className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border-2 shadow-sm transition-all duration-200 hover:shadow-md cursor-pointer ${statusColor[ticket.status] || statusColor["open"]}`}>
    {ticket.status === "on-hold" ? "On-Hold" : ticket.status === "deleted" ? "Deleted" : ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
  </span>
</CustomTooltip>
```

---

## Step 9: Wrap Type Column

### Find this code:
```tsx
<span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border-2 ${ticket.ticket_type === "support" ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-400" : "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900 text-purple-700 dark:text-purple-400"}`}>
  {ticket.ticket_type === "support" ? (ticket.is_internal ? "Issue" : "Support Issue") : "New Requirement"}
</span>
```

### Replace with:
```tsx
<CustomTooltip 
  content={`Type: ${ticket.ticket_type === "support" ? (ticket.is_internal ? "Issue" : "Support Issue") : "New Requirement"}`}
  position="top"
>
  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border-2 cursor-pointer ${ticket.ticket_type === "support" ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-400" : "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900 text-purple-700 dark:text-purple-400"}`}>
    {ticket.ticket_type === "support" ? (ticket.is_internal ? "Issue" : "Support Issue") : "New Requirement"}
  </span>
</CustomTooltip>
```

---

## Step 10: Wrap Project Column (if exists)

### Find project display code and wrap with:
```tsx
<CustomTooltip 
  content={
    <div>
      <div className="font-semibold">{ticket.project_name || "No Project"}</div>
      {ticket.estimated_release_date && (
        <div className="text-xs opacity-80 mt-1">
          Release: {format(new Date(ticket.estimated_release_date), "dd MMM yyyy")}
        </div>
      )}
    </div>
  }
  position="top"
>
  {/* existing project display */}
</CustomTooltip>
```

---

## Benefits of Adding Tooltips

### 1. **Better UX**
- Users can see full text without clicking
- Hover interaction is intuitive
- No need to expand columns

### 2. **Space Efficiency**
- Keep columns narrow
- Show more data in viewport
- Maintain clean table layout

### 3. **Rich Information**
- Show additional context in tooltips
- Display related data (groups, dates, etc.)
- Format data nicely

### 4. **Consistent Behavior**
- All truncated content has tooltips
- Uniform interaction pattern
- Professional appearance

---

## Tooltip Features

### CustomTooltip Props:
- `content`: String or React node to display
- `position`: "top" | "bottom" | "left" | "right"
- `maxLength`: Characters before truncating (default: 100)
- `showMoreButton`: Show expand button for long content
- `delay`: Delay before showing (default: 300ms)

### Features:
- ✅ Auto-positioning (stays in viewport)
- ✅ Expandable for long content
- ✅ Smooth animations
- ✅ Dark mode support
- ✅ Arrow indicator
- ✅ Hover to keep open

---

## Testing Checklist

After implementing:

1. ✅ Hover over ticket ID - shows full ID
2. ✅ Hover over title - shows full title + category
3. ✅ Hover over creator - shows full name + group
4. ✅ Hover over assignee - shows full name + group
5. ✅ Hover over target group - shows full name
6. ✅ Hover over date - shows full timestamp
7. ✅ Hover over status - shows status name
8. ✅ Hover over type - shows full type name
9. ✅ Tooltips stay in viewport
10. ✅ Tooltips work in dark mode

---

## Example: Complete Column with Tooltip

```tsx
<td className="px-4 py-4">
  <CustomTooltip 
    content={
      <div>
        <div className="font-semibold mb-1">{ticket.title}</div>
        {ticket.description && (
          <div className="text-xs opacity-80 mt-2 max-w-md">
            {ticket.description}
          </div>
        )}
      </div>
    }
    position="top"
    maxLength={200}
    showMoreButton={true}
  >
    <div className="max-w-xs cursor-pointer">
      <p className="font-semibold text-slate-900 dark:text-white text-sm truncate hover:text-blue-600 transition-colors">
        {ticket.title}
      </p>
    </div>
  </CustomTooltip>
</td>
```

---

## Notes

- Add `cursor-pointer` class to elements with tooltips
- Use `truncate` class for text that should be cut off
- Set `max-w-*` classes to control column width
- Add `min-w-0 flex-1` to flex children that should truncate
- Use rich content in tooltips (formatted text, multiple lines)
- Position tooltips appropriately based on column location

---

## Result

After implementation, all truncated columns will show full content on hover with beautiful, professional tooltips that:
- Stay within viewport
- Support dark mode
- Show rich formatted content
- Have smooth animations
- Provide excellent UX

Enjoy your enhanced table with tooltips! 🎉

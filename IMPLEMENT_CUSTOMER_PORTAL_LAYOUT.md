# Implement Customer Portal Layout - Complete Guide

## Current vs Target Layout

### Current Ticket Portal Layout
- Radio buttons for Customer/Internal ticket
- Radio buttons for Support/Requirement
- Multiple sections with headers and icons
- Complex conditional rendering
- Scattered field layout

### Target Customer Portal Layout
- Clean two-column grid
- Search bar at top
- Simple dropdowns (no radio buttons)
- Optional sections clearly marked
- Consistent spacing

## Step-by-Step Implementation

### Step 1: Update Form Header
**Add search/quick-fill section:**
```tsx
<div className="mb-6">
  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
    Quick Fill
  </label>
  <div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
    <input
      type="text"
      placeholder="Search..."
      className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm"
    />
  </div>
</div>
```

### Step 2: Create Two-Column Grid
**Replace radio button sections with grid:**
```tsx
<div className="grid grid-cols-2 gap-4 mb-6">
  {/* Row 1 */}
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-2">
      Functional Area *
    </label>
    <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
      <option>Select functional area...</option>
    </select>
  </div>
  
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-2">
      Business Group *
    </label>
    <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
      <option>Select business group...</option>
    </select>
  </div>
  
  {/* Row 2 */}
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-2">
      Category *
    </label>
    <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
      <option>Select a category...</option>
    </select>
  </div>
  
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-2">
      Sub Category *
    </label>
    <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
      <option>Select a category first</option>
    </select>
  </div>
</div>
```

### Step 3: Add Full-Width Sections
**Description textarea:**
```tsx
<div className="mb-6">
  <label className="block text-sm font-medium text-slate-700 mb-2">
    Description
  </label>
  <textarea
    rows={4}
    placeholder="Auto-filled based on category and sub-category selection. You can edit this."
    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
  />
</div>
```

**Optional sections:**
```tsx
<div className="mb-6">
  <label className="block text-sm font-medium text-slate-700 mb-2">
    Deliverables (Optional)
  </label>
  <div className="space-y-2">
    <label className="flex items-center gap-2">
      <input type="checkbox" className="w-4 h-4" />
      <span className="text-sm">Option 1</span>
    </label>
    <label className="flex items-center gap-2">
      <input type="checkbox" className="w-4 h-4" />
      <span className="text-sm">Option 2</span>
    </label>
  </div>
</div>

<div className="mb-6">
  <label className="block text-sm font-medium text-slate-700 mb-2">
    Attachments (Optional)
  </label>
  <button className="px-4 py-2 bg-black text-white rounded-lg text-sm">
    Choose files
  </button>
</div>
```

### Step 4: Update Bottom Actions
```tsx
<div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200">
  <button
    type="button"
    className="px-5 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
  >
    Cancel
  </button>
  <button
    type="submit"
    className="px-5 py-2 bg-black hover:bg-gray-800 text-white rounded-lg text-sm font-medium"
  >
    Create Ticket
  </button>
</div>
```

## CSS Classes to Use

### Container
```
bg-white dark:bg-slate-800 
border border-slate-200 dark:border-slate-700 
rounded-lg 
p-6
```

### Grid Layout
```
grid grid-cols-2 gap-4
```

### Labels
```
block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2
```

### Inputs/Selects
```
w-full px-3 py-2 
border border-slate-300 dark:border-slate-600 
rounded-lg 
text-sm
focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900
```

### Buttons
**Primary (Black):**
```
px-5 py-2 
bg-black hover:bg-gray-800 
text-white 
rounded-lg 
text-sm font-medium 
transition-colors
```

**Secondary (Outline):**
```
px-5 py-2 
border border-slate-300 
text-slate-700 
rounded-lg 
text-sm font-medium 
hover:bg-slate-50 
transition-colors
```

## Files to Modify

1. **components/tickets/create-ticket-form.tsx**
   - Restructure entire form layout
   - Remove radio button sections
   - Implement two-column grid
   - Add search bar
   - Simplify conditional logic

2. **app/dashboard/page.tsx**
   - Already updated with correct container

3. **components/tickets/create-ticket-form-enhanced.css**
   - May need to remove or update custom styles
   - Prefer Tailwind classes

## Implementation Priority

### High Priority (Core Layout)
1. ✅ Remove shadows (DONE)
2. ✅ Update navbar (DONE)
3. ⏳ Convert to two-column grid
4. ⏳ Remove radio button sections
5. ⏳ Simplify field layout

### Medium Priority (Features)
6. ⏳ Add search/quick-fill bar
7. ⏳ Add optional sections
8. ⏳ Update button styling

### Low Priority (Polish)
9. ⏳ Add field validation styling
10. ⏳ Add loading states
11. ⏳ Add success messages

## Next Steps

Would you like me to:
1. **Restructure the entire form** to match Customer Portal layout
2. **Create a new simplified form component** from scratch
3. **Make incremental changes** to existing form

Recommendation: **Option 2** - Create new simplified component for cleaner, maintainable code that exactly matches Customer Portal.

# Customer Portal Layout Implementation Plan

## Layout Structure to Implement

### 1. Search Bar Section (Top)
```
┌─────────────────────────────────────────────────────┐
│ Quick Fill Customer                                  │
│ 🔍 Search customers...                              │
└─────────────────────────────────────────────────────┘
```

### 2. Two-Column Grid Form
```
┌──────────────────────────┬──────────────────────────┐
│ Customer Name            │ Organization             │
│ [John Smith]             │ [Acme Corp]              │
├──────────────────────────┼──────────────────────────┤
│ Email                    │ Phone                    │
│ [john@example.com]       │ [555-0123]               │
├──────────────────────────┼──────────────────────────┤
│ Mode                     │ Type                     │
│ [Select ▼]               │ [Select ▼]               │
└──────────────────────────┴──────────────────────────┘
```

### 3. Full-Width Sections
```
┌─────────────────────────────────────────────────────┐
│ Notes                                                │
│ [Interaction details...]                            │
│                                                      │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ Deliverables (Optional)                             │
│ ☐ MF Buddy                                          │
│ ☐ Create Ticket                                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ Attachments (Optional)                              │
│ [Choose files]                                      │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ ☐ Save customer for quick fill                     │
└─────────────────────────────────────────────────────┘
```

## Mapping to Ticket Portal Fields

### Customer Portal → Ticket Portal
- Customer Name → Title
- Organization → Business Group / Organization
- Email → (Not needed for tickets)
- Phone → (Not needed for tickets)
- Mode → Ticket Type (Support/Requirement)
- Type → Category
- Notes → Description
- Deliverables → (Custom checkboxes for ticket options)
- Attachments → Attachments

## Implementation Steps

1. **Simplify Form Structure**
   - Remove radio button sections
   - Use clean two-column grid
   - Add search/quick-fill at top

2. **Update Field Layout**
   - Grid: `grid grid-cols-2 gap-4`
   - Labels above inputs
   - Clean input styling

3. **Add Optional Sections**
   - Collapsible or always visible
   - Checkbox lists for options
   - File upload section

4. **Bottom Actions**
   - Left: Cancel button (outline)
   - Right: Create Ticket button (black)

## Styling Guidelines
- White card on gray background
- No shadows (flat design)
- Border: `border border-slate-200`
- Rounded: `rounded-lg`
- Padding: `p-6`
- Input padding: `px-3 py-2`
- Font sizes: `text-sm` for labels, `text-sm` for inputs

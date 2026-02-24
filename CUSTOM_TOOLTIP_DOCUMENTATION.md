# Custom Tooltip Components - Documentation

## Overview
Two reusable tooltip components with expandable content and "Show More" functionality.

## Date
February 24, 2026

## Components

### 1. CustomTooltip (Simple)
Basic tooltip with truncation and expand functionality.

**File**: `components/ui/custom-tooltip.tsx`

### 2. AdvancedTooltip (Feature-Rich)
Advanced tooltip with multiple options, variants, and triggers.

**File**: `components/ui/advanced-tooltip.tsx`

---

## CustomTooltip (Simple Version)

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `React.ReactNode` | Required | The element that triggers the tooltip |
| `content` | `string \| React.ReactNode` | Required | The tooltip content |
| `maxLength` | `number` | `100` | Maximum characters before truncating |
| `position` | `"top" \| "bottom" \| "left" \| "right"` | `"top"` | Tooltip position |
| `showMoreButton` | `boolean` | `true` | Show expand/collapse button |
| `className` | `string` | `""` | Additional CSS classes for trigger |
| `delay` | `number` | `300` | Delay before showing tooltip (ms) |

### Basic Usage

```tsx
import CustomTooltip from "@/components/ui/custom-tooltip"

// Simple text tooltip
<CustomTooltip content="This is a simple tooltip">
  <button>Hover me</button>
</CustomTooltip>

// Long content with truncation
<CustomTooltip 
  content="This is a very long description that will be truncated after 100 characters by default. Users can click 'Show More' to see the full content."
  maxLength={50}
>
  <span className="text-blue-600 cursor-help">ℹ️</span>
</CustomTooltip>

// Bottom positioned
<CustomTooltip 
  content="This tooltip appears below"
  position="bottom"
>
  <button>Hover me</button>
</CustomTooltip>

// No truncation
<CustomTooltip 
  content="Short text"
  showMoreButton={false}
>
  <span>Info</span>
</CustomTooltip>
```

---

## AdvancedTooltip (Full-Featured Version)

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `React.ReactNode` | Required | The element that triggers the tooltip |
| `title` | `string` | - | Optional title header |
| `content` | `string \| React.ReactNode` | Required | The tooltip content |
| `maxLength` | `number` | `150` | Maximum characters before truncating |
| `position` | `"top" \| "bottom" \| "left" \| "right" \| "auto"` | `"auto"` | Tooltip position (auto-detects best position) |
| `showMoreButton` | `boolean` | `true` | Show expand/collapse button |
| `showCloseButton` | `boolean` | `false` | Show X close button in header |
| `className` | `string` | `""` | Additional CSS classes for trigger |
| `tooltipClassName` | `string` | `""` | Additional CSS classes for tooltip |
| `delay` | `number` | `300` | Delay before showing tooltip (ms) |
| `trigger` | `"hover" \| "click"` | `"hover"` | How to trigger the tooltip |
| `width` | `"sm" \| "md" \| "lg" \| "xl" \| "auto"` | `"md"` | Tooltip width |
| `variant` | `"dark" \| "light"` | `"dark"` | Color scheme |

### Advanced Usage Examples

#### 1. Auto-Positioning Tooltip
```tsx
import AdvancedTooltip from "@/components/ui/advanced-tooltip"

<AdvancedTooltip 
  content="This tooltip automatically positions itself to stay on screen"
  position="auto"
>
  <button>Smart Position</button>
</AdvancedTooltip>
```

#### 2. Click-Triggered Tooltip
```tsx
<AdvancedTooltip 
  title="Important Information"
  content="Click outside or the X button to close this tooltip"
  trigger="click"
  showCloseButton={true}
>
  <button className="px-4 py-2 bg-blue-500 text-white rounded">
    Click for Info
  </button>
</AdvancedTooltip>
```

#### 3. Light Variant Tooltip
```tsx
<AdvancedTooltip 
  content="This is a light-themed tooltip"
  variant="light"
>
  <span className="text-gray-600">Light Theme</span>
</AdvancedTooltip>
```

#### 4. Large Tooltip with Title
```tsx
<AdvancedTooltip 
  title="User Guide"
  content="This is a comprehensive guide with lots of information. The tooltip is wider and includes a title header for better organization."
  width="xl"
  maxLength={200}
>
  <button className="p-2 rounded-full bg-blue-100 text-blue-600">
    ?
  </button>
</AdvancedTooltip>
```

#### 5. Rich Content Tooltip
```tsx
<AdvancedTooltip 
  title="Ticket Details"
  content={
    <div>
      <p className="font-semibold mb-2">Status: Open</p>
      <p className="text-xs mb-1">Created: Feb 24, 2026</p>
      <p className="text-xs">Assignee: John Doe</p>
    </div>
  }
  showMoreButton={false}
  width="lg"
>
  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">
    #12345
  </span>
</AdvancedTooltip>
```

#### 6. Description Truncation Example
```tsx
<AdvancedTooltip 
  title="Ticket Description"
  content="This is a very long ticket description that contains detailed information about the issue. Users reported that the login page is not loading properly on mobile devices. The issue occurs specifically on iOS Safari and Chrome browsers. Multiple users have confirmed this behavior across different iPhone models including iPhone 12, 13, and 14."
  maxLength={100}
  width="lg"
>
  <div className="p-2 border rounded cursor-pointer hover:bg-gray-50">
    <p className="text-sm font-medium">Ticket #789</p>
    <p className="text-xs text-gray-500 truncate">
      This is a very long ticket description...
    </p>
  </div>
</AdvancedTooltip>
```

---

## Real-World Use Cases

### 1. Ticket Table - Description Preview
```tsx
import AdvancedTooltip from "@/components/ui/advanced-tooltip"

// In your tickets table
<td className="px-3 py-2">
  <AdvancedTooltip
    title={`Ticket #${ticket.ticket_number}`}
    content={ticket.description}
    maxLength={150}
    position="auto"
    width="lg"
  >
    <div className="truncate max-w-xs cursor-pointer hover:text-primary">
      {ticket.description}
    </div>
  </AdvancedTooltip>
</td>
```

### 2. User Info Card
```tsx
<AdvancedTooltip
  title={user.full_name}
  content={
    <div className="space-y-1">
      <p className="text-xs">Email: {user.email}</p>
      <p className="text-xs">Role: {user.role}</p>
      <p className="text-xs">Department: {user.department}</p>
      <p className="text-xs">Joined: {format(new Date(user.created_at), 'MMM dd, yyyy')}</p>
    </div>
  }
  showMoreButton={false}
  trigger="hover"
  width="md"
>
  <div className="flex items-center gap-2 cursor-pointer">
    <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center">
      {user.full_name.charAt(0)}
    </div>
    <span className="text-sm font-medium">{user.full_name}</span>
  </div>
</AdvancedTooltip>
```

### 3. Status Badge with Details
```tsx
<AdvancedTooltip
  title="Status Details"
  content={`Status changed to ${ticket.status} by ${ticket.updated_by} on ${format(new Date(ticket.updated_at), 'MMM dd, yyyy HH:mm')}`}
  position="top"
  width="md"
>
  <span className={`px-2 py-1 rounded text-xs font-medium cursor-help ${statusColor[ticket.status]}`}>
    {ticket.status}
  </span>
</AdvancedTooltip>
```

### 4. Help Icon with Instructions
```tsx
<AdvancedTooltip
  title="How to Use"
  content="1. Select a ticket type\n2. Fill in all required fields\n3. Add attachments if needed\n4. Click Submit to create the ticket\n\nNote: All tickets are reviewed by SPOC before assignment."
  trigger="click"
  showCloseButton={true}
  width="lg"
  variant="light"
>
  <button className="p-1 rounded-full hover:bg-gray-100">
    <HelpCircle className="w-4 h-4 text-gray-500" />
  </button>
</AdvancedTooltip>
```

### 5. Truncated Comments
```tsx
{comments.map((comment) => (
  <div key={comment.id} className="border-b pb-2">
    <div className="flex items-center justify-between mb-1">
      <span className="text-sm font-medium">{comment.user_name}</span>
      <span className="text-xs text-gray-500">
        {format(new Date(comment.created_at), 'MMM dd, HH:mm')}
      </span>
    </div>
    
    <AdvancedTooltip
      content={comment.content}
      maxLength={100}
      position="auto"
      width="lg"
    >
      <p className="text-sm text-gray-700 cursor-pointer hover:text-gray-900">
        {comment.content.length > 100 
          ? `${comment.content.slice(0, 100)}...` 
          : comment.content
        }
      </p>
    </AdvancedTooltip>
  </div>
))}
```

---

## Features

### ✨ Key Features

1. **Expandable Content**
   - Automatically truncates long text
   - "Show More" / "Show Less" buttons
   - Smooth transitions

2. **Smart Positioning**
   - Auto-detect best position
   - Boundary detection
   - Stays within viewport

3. **Multiple Triggers**
   - Hover (default)
   - Click
   - Configurable delay

4. **Customizable Appearance**
   - Dark/Light variants
   - Multiple width options
   - Custom styling support

5. **Interactive**
   - Hover over tooltip without closing
   - Click to expand/collapse
   - Optional close button

6. **Rich Content Support**
   - Plain text
   - React components
   - Formatted content

### 🎨 Styling

Both tooltips support:
- Dark mode
- Custom CSS classes
- Tailwind utilities
- Responsive design

### 📱 Responsive Behavior

- Automatically adjusts position on small screens
- Prevents overflow
- Touch-friendly for mobile devices

---

## Best Practices

### 1. Choose the Right Component

**Use CustomTooltip when:**
- You need simple hover tooltips
- Content is mostly text
- You want lightweight implementation

**Use AdvancedTooltip when:**
- You need click-triggered tooltips
- You want title headers
- You need rich content support
- You want auto-positioning
- You need light/dark variants

### 2. Content Length

- Keep `maxLength` between 100-200 characters for best UX
- Use `showMoreButton={false}` for short content
- Consider breaking very long content into separate sections

### 3. Positioning

- Use `position="auto"` for dynamic content
- Use fixed positions when you know the layout
- Test positioning near screen edges

### 4. Trigger Types

- Use `trigger="hover"` for informational tooltips
- Use `trigger="click"` for interactive content
- Add `showCloseButton={true}` for click-triggered tooltips

### 5. Performance

- Avoid heavy React components in tooltip content
- Use memoization for expensive computations
- Keep tooltip content simple when possible

---

## Accessibility

Both components include:
- Proper ARIA labels
- Keyboard navigation support (for click trigger)
- Focus management
- Screen reader friendly

### Keyboard Support (Click Trigger)

- `Escape`: Close tooltip
- `Click outside`: Close tooltip

---

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Full support

---

## Migration from Old Tooltips

### Before (Basic HTML title)
```tsx
<span title="This is a tooltip">Hover me</span>
```

### After (CustomTooltip)
```tsx
<CustomTooltip content="This is a tooltip">
  <span>Hover me</span>
</CustomTooltip>
```

### Before (Custom implementation)
```tsx
<div className="relative group">
  <span>Hover me</span>
  <div className="absolute hidden group-hover:block ...">
    Tooltip content
  </div>
</div>
```

### After (AdvancedTooltip)
```tsx
<AdvancedTooltip content="Tooltip content">
  <span>Hover me</span>
</AdvancedTooltip>
```

---

## Troubleshooting

### Tooltip not showing?
- Check z-index conflicts
- Verify content is not empty
- Check if parent has `overflow: hidden`

### Tooltip position wrong?
- Try `position="auto"`
- Check viewport boundaries
- Verify trigger element is visible

### "Show More" not appearing?
- Check if content length > maxLength
- Verify `showMoreButton={true}`
- Ensure content is a string (not React component)

---

## Examples in Codebase

See these files for real-world usage:
- `components/tickets/ticket-history-tooltip.tsx` - History tooltip implementation
- `components/tickets/tickets-table.tsx` - Table cell tooltips
- `app/tickets/[id]/page.tsx` - Ticket detail tooltips

---

## Future Enhancements

Potential improvements:
1. Animation options (fade, slide, scale)
2. Custom arrow styles
3. Tooltip groups (only one open at a time)
4. Persistent tooltips (stay open until clicked)
5. Tooltip on disabled elements
6. Custom trigger elements (not just hover/click)
7. Tooltip chaining (tooltip within tooltip)
8. Analytics tracking (tooltip views)

---

## Notes

- Both components use React portals for z-index management
- Tooltips automatically clean up on unmount
- Performance optimized with proper memoization
- Fully typed with TypeScript
- No external dependencies (except Lucide icons)

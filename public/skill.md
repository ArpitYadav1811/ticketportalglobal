# Frontend Design Skill

## Overview

This skill provides comprehensive guidelines for frontend development in this web analytics project. It covers the design system, component architecture, styling patterns, UI conventions, and best practices specific to this codebase.

---

## Technology Stack

### Core Technologies

- **Framework**: Next.js 14+ (App Router with React Server Components)
- **UI Library**: React 18 with TypeScript 5
- **Styling**: Tailwind CSS 3.4 (utility-first CSS framework)
- **Component Library**: shadcn/ui (Radix UI primitives with Tailwind styling)
- **State Management**:
  - React Context API for global state
  - TanStack React Query v5 for server state
- **Icons**: Lucide React, React Icons
- **Forms**: React Hook Form, Formik with Yup/Zod validation
- **Charts**: Recharts v2.12, Chart.js v4.4

### Build Tools

- PostCSS with Tailwind plugin
- TypeScript (strict mode)
- ESLint & Prettier
- Storybook v8.3 for component documentation

---

## Design System

### 1. Color Palette

**Color System**: HSL-based with CSS variables for theming

#### Light Mode Colors

```css
--background:
  0 0% 100% --foreground: 240 10% 3.9% --primary: 306, 82%,
  35% /* Purple/Magenta - Brand color */ --secondary: 274, 100%,
  29% /* Deep Purple - Secondary brand */ --card: 0 0% 100% --destructive: 0
    84.2% 60.2% /* Red for errors/destructive actions */ --muted: 240 4.8% 95.9%
    /* Subtle backgrounds */ --accent: 240 4.8% 95.9% /* Accent elements */
    --border: 240 5.9% 90% /* Border color */;
```

#### Dark Mode Colors

```css
--background:
  215.3, 25%, 26.7% --card: 221, 39%, 11% --primary: 306, 82%,
  35% /* Same as light mode */ --secondary: 240 3.7% 15.9% --muted: 240 3.7%
    15.9% --destructive: 0 62.8% 30.6% --border: 240 3.7% 15.9%;
```

#### Chart Colors (5 variants)

```css
/* Light Mode */
--chart-1: 12 76% 61% --chart-2: 173 58% 39% --chart-3: 197 37% 24%
  --chart-4: 43 74% 66% --chart-5: 27 87% 67% /* Dark Mode */ --chart-1: 220 70%
  50% --chart-2: 160 60% 45% --chart-3: 30 80% 55% --chart-4: 280 65% 60%
  --chart-5: 340 75% 55%;
```

#### Usage in Components

```tsx
// Use semantic color tokens
<div className="bg-primary text-primary-foreground">...</div>
<div className="bg-card text-card-foreground border border-border">...</div>
<Button variant="destructive">Delete</Button>
```

### 2. Typography Scale

**Custom Font Sizes** (defined in `tailwind.config.ts`):

```typescript
fontSize: {
  header: "1.25rem",      // 20px - Card titles, main headings
  subHeader: "1rem",      // 16px - Secondary headings, fullscreen legends
  body: "0.875rem",       // 14px - Standard body text, descriptions
  subBody: "0.750rem",    // 12px - Labels, small text, filters (most common)
  smallFont: "0.600rem"   // 9.6px - Input fields, minimal text
}
```

**Base Font**: Arial, Helvetica, sans-serif

#### Typography Usage Guidelines

- **`text-header`**: Primary headings, card titles, page titles
- **`text-subHeader`**: Secondary headings, section titles, fullscreen mode labels
- **`text-body`**: Paragraph text, descriptions, standard UI text
- **`text-subBody`**: Labels, filter text, table headers, small descriptions (389+ uses in codebase)
- **`text-smallFont`**: Button text (default), input placeholders, minimal UI elements

#### Example

```tsx
<h1 className="text-header font-semibold">Dashboard Overview</h1>
<h2 className="text-subHeader text-muted-foreground">Performance Metrics</h2>
<p className="text-body">Your analytics data for the selected period.</p>
<span className="text-subBody text-muted-foreground">Last updated: 2 mins ago</span>
<Button className="text-smallFont">Submit</Button>
```

### 3. Spacing & Layout

**Spacing System**: Uses Tailwind's default scale (0.25rem increments)

#### Common Spacing Patterns

```tsx
// Card spacing
<Card className="p-4 space-y-3">        // Standard card padding
<CardContent className="p-6">           // Content padding
<CardHeader className="pb-3">           // Header with reduced bottom padding

// Section spacing
<div className="space-y-4">             // Vertical section spacing
<div className="gap-2 sm:gap-3 md:gap-4"> // Responsive gaps

// Chart specific
<div className="chart-card-content">    // Custom: pl-1 pr-3 pt-2 pb-0
```

### 4. Border Radius

**Border Radius Tokens**:

```typescript
borderRadius: {
  lg: "var(--radius)",                  // 0.5rem (8px)
  md: "calc(var(--radius) - 2px)",     // 6px
  sm: "calc(var(--radius) - 4px)"      // 4px
}
```

**Button Variants**:

- Default buttons: `rounded-full` (fully rounded)
- Cards: `rounded-lg` (8px)
- Inputs: `rounded-md` (6px)

### 5. Shadows

Uses Tailwind's default shadow system with custom additions for dark mode:

```tsx
<Card className="shadow-sm">            // Subtle shadow
<Dialog className="shadow-lg">          // Prominent shadow
<Popover className="shadow-md">         // Medium shadow
```

---

## Component Architecture

### Component Organization

```
src/
├── components/
│   ├── ui/                    # shadcn/ui base components (52 files)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── ...
│   ├── mf/                    # Business-specific components (61+ files)
│   │   ├── MFTopBar.tsx       # Top navigation bar
│   │   ├── MFWebFraudAsideMenu.tsx  # Main sidebar
│   │   ├── charts/            # Chart components
│   │   ├── forms/             # Form components
│   │   └── ...
│   └── v2/                    # Next-gen components
└── lib/
    ├── utils.tsx              # Utility functions (cn, formatters)
    └── menu-utils.ts          # Menu navigation helpers
```

### Component Patterns

#### 1. Composition Pattern (shadcn/ui style)

```tsx
<Card>
  <CardHeader>
    <CardTitle className="text-header">Title</CardTitle>
    <CardDescription className="text-body">Description</CardDescription>
  </CardHeader>
  <CardContent>{/* Content */}</CardContent>
  <CardFooter>{/* Footer actions */}</CardFooter>
</Card>
```

#### 2. Variant-Based Components (CVA)

```tsx
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center text-smallFont", // Base styles
  {
    variants: {
      variant: {
        default: "bg-secondary text-white hover:opacity-75 rounded-full",
        destructive: "bg-destructive text-destructive-foreground",
        outline: "border border-primary bg-background",
        secondary: "bg-secondary text-white hover:bg-secondary/90",
        ghost: "hover:bg-accent",
        link: "text-primary underline-offset-4",
      },
      size: {
        default: "h-10 px-4 py-2",
        xs: "h-6 px-2 py-1",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
        icon: "h-10 w-10",
        "icon-xs": "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
```

#### 3. Context-Based State Management

```tsx
// Create context
interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", !isDarkMode ? "dark" : "light");
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
```

---

## Navigation Components

### Top Bar Component (`MFTopBar.tsx`)

**Structure**:

- Fixed height header with responsive layout
- Left: Menu toggle button (mobile)
- Center: Package selector, Date range picker
- Right: Support, Theme toggle, Products menu, User menu

**Key Features**:

```tsx
interface MFTopBarType {
  isExpanded: boolean; // Sidebar expansion state
  onToggle: () => void; // Toggle sidebar
  isCalender?: boolean; // Show/hide calendar
  isToggle?: boolean; // Show/hide toggle button
}

// Mobile menu toggle
<button
  onClick={onToggle}
  className="group rounded-lg p-2 hover:scale-105 hover:bg-secondary/20"
>
  <List className="h-5 w-5 text-white md:text-secondary" />
</button>;

// Popover management (single open at a time)
const [activePopover, setActivePopover] = useState<string | null>(null);
```

### Sidebar Component (`MFWebFraudAsideMenu.tsx`)

**Structure**:

- API-driven menu system with nested submenus
- Dynamic logo (full when expanded, icon when collapsed)
- Elegant toggle button with circular notch design
- Hover expansion on desktop, overlay on mobile

**Key Features**:

```tsx
interface MenuItem {
  title: string;
  icon: ReactNode;
  route?: string;
  subMenu?: MenuItem[];
  embeddedMenu?: boolean;
  Url?: string;
}

// API menu conversion
const convertApiResponseToMenu = (apiMenu: ApiMenuItem[]): MenuItem[] => {
  return apiMenu.map((item) => ({
    title: item?.Name ?? "Untitled",
    icon: parseSvgString(item?.Icon),
    route: item?.Route || undefined,
    subMenu: item?.SubMenus?.length
      ? convertApiResponseToMenu(item.SubMenus)
      : undefined,
  }));
};

// Toggle button with notch design
<div className="absolute right-[-12px] top-4">
  {/* Circular notch background */}
  <div className="w-9 h-9 rounded-full bg-white dark:bg-card shadow-sm" />

  {/* Toggle button */}
  <div className="relative -ml-8 w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary">
    {isExpanded ? <ChevronLeft /> : <ChevronRight />}
  </div>
</div>;
```

**Active Route Detection**:

```tsx
const isActive = React.useMemo(() => {
  if (route && pathName === route) return true;
  if (subMenu.length > 0) {
    return subMenu.some(
      (item) =>
        item.route &&
        (pathName === item.route || pathName.startsWith(item.route + "/")),
    );
  }
  return false;
}, [pathName, route, subMenu]);
```

### Layout Pattern

```tsx
<div
  className="flex h-screen flex-col w-full"
  style={{
    "--sidebar-width": (Locked ? Toggle : Toggle || IsHover) ? "14rem" : "4rem",
  }}
>
  {/* Header */}
  <MFTopBar isExpanded={Toggle || IsHover} onToggle={handleToggle} />

  {/* Main content */}
  <div className="flex h-full flex-1 overflow-hidden">
    {/* Desktop sidebar */}
    <div className="hidden lg:block">
      <MFWebFraudAsideMenu
        isExpanded={Toggle || IsHover}
        onHover={(val) => setIsHover(val)}
      />
    </div>

    {/* Mobile overlay sidebar */}
    {Toggle && (
      <div className="lg:hidden fixed inset-0 z-[60]">
        <div className="absolute inset-0 bg-black/40" onClick={closeMenu} />
        <MFWebFraudAsideMenu isExpanded={true} />
      </div>
    )}

    {/* Content area */}
    <div className="flex-1 overflow-auto ml-0 lg:ml-[var(--sidebar-width)]">
      {children}
    </div>
  </div>
</div>
```

---

## Responsive Design

### Philosophy

This project follows a **mobile-first responsive design** approach, ensuring optimal experience across all device sizes from smartphones to large desktop monitors. All layouts adapt gracefully using Tailwind's responsive utilities.

### Breakpoints

```typescript
sm: '640px'   // Small devices (landscape phones, small tablets)
md: '768px'   // Medium devices (tablets)
lg: '1024px'  // Large devices (desktops) ⭐ PRIMARY BREAKPOINT
xl: '1280px'  // Extra large devices (large desktops)
2xl: '1536px' // 2X large devices (ultra-wide monitors)
```

**Note**: `lg:` (1024px) is the primary breakpoint for sidebar/layout transitions.

---

## Responsive Layout Patterns

### 1. Responsive Grid Layouts

#### Basic Grid Pattern

```tsx
// Cards: 1 column mobile → 2 tablet → 5 desktop
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
  {cards.map((card) => (
    <Card key={card.id}>{card.content}</Card>
  ))}
</div>
```

#### Dashboard Grid with Column Spanning

```tsx
// From: src/app/(web)/web-analytics/dashboard/overall-summary/page.tsx
<div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5 w-full gap-2">
  {/* Sidebar - 1 column */}
  <div className="col-span-1">
    <TrafficStatsCard />
  </div>

  {/* Main content - remaining columns */}
  <div className="col-span-1 md:col-span-2 lg:col-span-4 xl:col-span-4">
    <TrafficTrendCharts />
  </div>
</div>
```

#### Uneven Grid Distribution

```tsx
// From: src/app/(web)/web-brand/video/attention_metrics/page.tsx
<div className="grid grid-cols-1 lg:grid-cols-[1fr_3fr] gap-2 w-full">
  {/* Left: 25% width */}
  <div className="w-full lg:w-2/5">
    <Sidebar />
  </div>

  {/* Right: 75% width */}
  <div className="w-full lg:w-3/5">
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {/* Nested responsive grid */}
    </div>
  </div>
</div>
```

#### Dynamic Grid with Props

```tsx
// From: src/components/v2/charts/ChartSkeletons.tsx
interface GridProps {
  mobile?: number; // columns on mobile
  tablet?: number; // columns on tablet
  desktop?: number; // columns on desktop
}

const colsMap: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
};

const gridClass = `grid ${colsMap[mobile]} sm:${colsMap[tablet]} lg:${colsMap[desktop]} gap-4`;
```

---

### 2. Responsive Flex Layouts

#### Stack Vertically → Horizontally

```tsx
// From: src/components/v2/ReportingToolTable.tsx
<div className="flex flex-col md:flex-row gap-2">
  <Input placeholder="Search..." className="w-full md:w-64" />
  <Select>
    <SelectTrigger className="w-full md:w-40">
      <SelectValue />
    </SelectTrigger>
  </Select>
  <Button className="w-full md:w-auto">Apply</Button>
</div>
```

#### Two-Column Layout with Flex

```tsx
// From: src/app/(web)/web-brand/video/commonmodule/page.tsx
<div className="flex flex-col lg:flex-row gap-2">
  <div className="w-full lg:w-2/5">
    <Card>{/* Left panel */}</Card>
  </div>
  <div className="w-full lg:w-3/5">
    <Card>{/* Right panel */}</Card>
  </div>
</div>
```

#### Responsive Alignment

```tsx
// From: src/components/ui/pagination.tsx
<div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2.5 sm:gap-4">
  <div className="flex items-center gap-2">{/* Left controls */}</div>
  <div className="flex items-center gap-1">{/* Right pagination */}</div>
</div>
```

#### Card Header with Responsive Alignment

```tsx
// From: src/app/(web)/ticketing/components/TicketOverview.tsx
<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
  <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
    <span className="text-xs sm:text-subBody font-medium">Created By:</span>
    <span className="text-xs sm:text-subBody">John Doe</span>
  </div>
  <Button size="sm" className="w-full sm:w-auto">
    Action
  </Button>
</div>
```

---

### 3. Responsive Spacing

#### Progressive Gap Sizing

```tsx
// Gap increases with screen size
<div className="flex gap-2 sm:gap-3 md:gap-4 lg:gap-6">

// Space-y (vertical spacing)
<div className="space-y-2 sm:space-y-3 md:space-y-4">

// Grid gap
<div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 lg:gap-4">
```

#### Responsive Padding

```tsx
// From: src/components/v2/charts/ChartSkeletons.tsx
<div className="p-2 sm:p-3 md:p-4 lg:p-6">
  {/* Content with responsive padding */}
</div>

// Card spacing
<Card className="p-3 sm:p-4 md:p-6">
  <div className="space-y-3 sm:space-y-4">
    {/* Content */}
  </div>
</Card>
```

#### Responsive Margins

```tsx
// From: src/app/user-details/security/page.tsx
<div className="mx-2 sm:mx-4 md:mx-6 lg:mx-auto max-w-5xl">
  {/* Centered content with responsive margins */}
</div>
```

---

### 4. Responsive Component Sizing

#### Width Control

```tsx
// Full width mobile → Fixed width desktop
<SelectTrigger className="w-full md:w-[140px]">
  <SelectValue placeholder="Select..." />
</SelectTrigger>

// Max-width with responsive adjustment
<Input className="w-full max-w-xs md:max-w-md lg:max-w-lg" />

// Percentage-based widths
<div className="w-full md:w-1/2 lg:w-1/3 xl:w-1/4">
```

#### Height Adjustments

```tsx
// From: src/components/ui/Funnel.tsx
<div className="w-20 h-20 md:w-28 md:h-28 lg:w-32 lg:h-32 flex-shrink-0">
  {/* Responsive circle */}
</div>

// Dynamic chart heights
<ResponsiveContainer width="100%" height={isMobile ? 250 : isTablet ? 300 : 350}>
  <BarChart data={data}>...</BarChart>
</ResponsiveContainer>
```

#### Icon Sizing

```tsx
// From: src/components/v2/charts/ChartSkeletons.tsx
<Skeleton className="w-24 h-24 sm:w-32 sm:h-32 md:w-32 md:h-32 rounded-full" />
<Icon className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-8 lg:w-8" />
```

---

### 5. Container Patterns

#### Max-Width Containers

```tsx
// Centered container with max-width
<div className="w-full max-w-4xl mx-auto py-4 md:py-6 lg:py-10">
  {/* Content */}
</div>

// Responsive max-widths
<div className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-4xl mx-auto">
  {/* Content scales with screen size */}
</div>
```

#### Dialog/Modal Sizing

```tsx
// From: src/components/ui/dialog.tsx
<DialogContent className="sm:max-w-[425px]">
  {/* Small modal */}
</DialogContent>

<DialogContent className="sm:max-w-[600px] h-[600px]">
  {/* Medium modal */}
</DialogContent>

<DialogContent className="sm:max-w-[1000px]">
  {/* Large modal */}
</DialogContent>
```

#### Popover Sizing

```tsx
// From: src/components/mf/MFDateRangePickerModern.tsx
<PopoverContent className="w-full max-w-xl max-h-96 overflow-auto">
  <div className="w-auto max-w-[calc(100vw-100px)] md:max-w-[calc(100vw-120px)] overflow-hidden">
    {/* Date picker that respects viewport */}
  </div>
</PopoverContent>
```

---

### 6. Responsive Tables

#### Scrollable Table Container

```tsx
// From: src/components/v2/ReportingToolTable.tsx
<div className="w-full overflow-x-auto">
  <Table className="min-w-full">
    <TableHeader>
      <TableRow>
        <TableHead className="sticky top-0 bg-background text-subBody">
          Column 1
        </TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>{/* Rows */}</TableBody>
  </Table>
</div>
```

#### Responsive Table Controls

```tsx
<div className="flex flex-col md:flex-row gap-2 mb-4">
  {/* Search - full width on mobile */}
  <div className="relative w-full md:w-64">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />
    <Input placeholder="Search..." className="pl-9" />
  </div>

  {/* Filters - stack on mobile */}
  <Select>
    <SelectTrigger className="w-full md:w-40">
      <SelectValue />
    </SelectTrigger>
  </Select>
</div>
```

#### Conditional Column Display

```tsx
// Hide columns on mobile
<TableHead className="hidden md:table-cell">Desktop Only</TableHead>
<TableCell className="hidden md:table-cell">{value}</TableCell>

// Mobile-optimized table row
<TableRow className="flex flex-col md:table-row border-b md:border-0">
  {/* Stacked on mobile, table row on desktop */}
</TableRow>
```

---

### 7. Responsive Card Grids

#### Standard Card Grid

```tsx
// From: src/app/(web)/web-brand/video/quartile_progression/page.tsx
<div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4 w-full p-2">
  {data.map((item, index) => (
    <Card key={index} className="animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="text-header">{item.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{item.value}</div>
      </CardContent>
    </Card>
  ))}
</div>
```

#### Horizontal Scroll Fallback (Mobile)

```tsx
// Grid on desktop, horizontal scroll on mobile
<div className="flex flex-row flex-nowrap md:grid md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto md:overflow-x-visible pb-4 md:pb-0">
  {cards.map((card) => (
    <Card key={card.id} className="flex-shrink-0 w-64 md:w-auto">
      {/* Card stays 256px width on mobile, auto on desktop */}
    </Card>
  ))}
</div>
```

---

### 8. Mobile Navigation Patterns

#### Mobile Sidebar with Backdrop

```tsx
// From: src/app/(web)/layout.tsx
<>
  {/* Desktop sidebar */}
  <div className="hidden lg:block">
    <MFWebFraudAsideMenu isExpanded={isExpanded} onToggle={handleToggle} />
  </div>

  {/* Mobile overlay sidebar */}
  {mobileMenuOpen && (
    <div className="lg:hidden fixed inset-0 z-[60]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={closeMobileMenu} />

      {/* Sidebar */}
      <div className="absolute left-0 top-0 bottom-0 w-[280px] bg-background shadow-2xl">
        <MFWebFraudAsideMenu isExpanded={true} />
      </div>
    </div>
  )}

  {/* Content with dynamic margin */}
  <div className="flex-1 overflow-auto ml-0 lg:ml-[var(--sidebar-width)] transition-all">
    {children}
  </div>
</>
```

#### Mobile Filter Sidebar

```tsx
// From: src/components/v2/Filters/MobileFilterSidebar.tsx
<>
  {/* Filter button - mobile only */}
  <div className="md:hidden sticky top-[var(--topbar-height)] z-50 bg-background px-4 py-3 border-b">
    <Button onClick={toggleFilters} className="w-full">
      <Filter className="w-4 h-4 mr-2" />
      Filters
    </Button>
  </div>

  {/* Filter sidebar */}
  {isOpen && (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-background z-50 lg:hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">Filters</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Two-panel layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Categories */}
          <div className="w-1/3 border-r bg-muted/30 overflow-y-auto">
            {/* Filter categories */}
          </div>

          {/* Filter options */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Filter content */}
          </div>
        </div>
      </div>
    </>
  )}
</>
```

---

### 9. Responsive Dashboard Layouts

#### Complete Dashboard Example

```tsx
// From: src/app/(web)/web-analytics/dashboard/overall-summary/page.tsx
<div className="flex flex-col gap-2 p-2 sm:p-4 overflow-x-hidden">
  {/* Mobile filter toggle */}
  <div className="md:hidden sticky top-0 z-50 bg-background px-4 py-3 border-b">
    <Button onClick={toggleMobileFilters} className="w-full">
      <Filter className="w-4 h-4 mr-2" />
      Show Filters
    </Button>
  </div>

  {/* Main metrics - responsive grid */}
  <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-3 lg:grid-cols-5 w-full gap-2">
    <div className="col-span-1">
      <TrafficStatsCard />
    </div>
    <div className="col-span-1 md:col-span-2 lg:col-span-4">
      <TrafficTrendCharts />
    </div>
  </div>

  {/* Charts section - 2 columns on desktop */}
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
    <Card className="shadow-md">
      <CardContent className="chart-card-content">
        <StackedBarChart containerHeight="24rem" />
      </CardContent>
    </Card>
    <Card className="shadow-md">
      <CardContent className="chart-card-content">
        <LineChart containerHeight="24rem" />
      </CardContent>
    </Card>
  </div>

  {/* Additional sections */}
  <DistributionByCategory />
  <TrafficByPublisher />
</div>
```

---

### 10. Visibility Control

#### Hide/Show Elements

```tsx
// Hide on mobile, show on desktop
<div className="hidden md:block">
  <DesktopOnlyContent />
</div>

// Show on mobile, hide on desktop
<div className="md:hidden">
  <MobileOnlyContent />
</div>

// Show on tablet and up
<div className="hidden sm:block">
  <TabletAndDesktop />
</div>

// Complex visibility
<div className="hidden sm:block lg:hidden xl:block">
  {/* Visible on: sm, md, xl, 2xl. Hidden on: mobile, lg */}
</div>
```

#### Conditional Rendering with Icons

```tsx
// From: src/components/mf/TableComponent.tsx
<Button className="md:hidden">
  <Menu className="h-5 w-5" />
  <span className="sr-only">Menu</span>
</Button>

<Button className="hidden md:flex">
  <Menu className="h-5 w-5 mr-2" />
  <span>Open Menu</span>
</Button>
```

---

### 11. Responsive Typography

#### Font Size Scaling

```tsx
// Scale typography with screen size
<h1 className="text-body sm:text-subHeader md:text-header lg:text-2xl">
  Responsive Heading
</h1>

<p className="text-xs sm:text-subBody md:text-body">
  Responsive paragraph text
</p>

// Button text sizing
<Button className="text-xs sm:text-subBody md:text-body">
  Click Me
</Button>
```

#### Responsive Text Alignment

```tsx
<div className="text-center sm:text-left">
  {/* Centered on mobile, left-aligned on desktop */}
</div>

<div className="text-left md:text-center lg:text-right">
  {/* Changes alignment at each breakpoint */}
</div>
```

#### Text Truncation

```tsx
// From: src/components/report/filterModal/index.tsx
<span className="truncate max-w-[120px] sm:max-w-[200px] md:max-w-[300px]">
  {longText}
</span>

// Multi-line truncation
<p className="line-clamp-2 md:line-clamp-3 lg:line-clamp-none">
  {/* 2 lines mobile, 3 lines tablet, full text desktop */}
</p>
```

---

### 12. Custom Responsive Utilities

#### Custom Scrollbar Hiding

```tsx
// From: tailwind.config.ts
<div className="no-scrollbar overflow-auto">
  {/* Scrollable without visible scrollbar */}
</div>

// Styled scrollbar
<div className="scrollbar overflow-auto">
  {/* Custom styled scrollbar (0.3rem width) */}
</div>
```

#### Inline Scrollbar Styles

```tsx
// From: src/components/ui/pagination.tsx
<div className="overflow-x-auto [&::-webkit-scrollbar]:h-0.5 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20">
  {/* Custom scrollbar with Tailwind arbitrary values */}
</div>
```

#### Responsive Form Fields

```tsx
// From: src/components/mf/RowAddingDialog.tsx
<div className="flex flex-col md:flex-row gap-2 md:gap-4">
  <div className="w-full md:w-1/4">
    <Label className="text-subBody">Field 1</Label>
    <Input />
  </div>
  <div className="w-full md:w-1/4">
    <Label className="text-subBody">Field 2</Label>
    <Input />
  </div>
  <div className="w-full md:w-1/2">
    <Label className="text-subBody">Field 3</Label>
    <Input />
  </div>
</div>
```

---

### 13. Responsive Dialog Footer

```tsx
// From: src/components/ui/dialog.tsx
<DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2 sm:gap-0">
  <Button variant="outline" className="w-full sm:w-auto">
    Cancel
  </Button>
  <Button className="w-full sm:w-auto">Confirm</Button>
</DialogFooter>
```

---

## Responsive Design Best Practices

### 1. Mobile-First Approach

- Start with mobile layout (no prefix)
- Add responsive classes for larger screens (`sm:`, `md:`, `lg:`)
- Test on mobile devices first

### 2. Touch-Friendly Targets

- Minimum 44x44px tap targets on mobile
- Increase padding on mobile: `p-4 md:p-3`
- Add hover states only for desktop: `md:hover:bg-accent`

### 3. Content Hierarchy

- Show most important content first on mobile
- Use `order-` utilities to rearrange flex items:
  ```tsx
  <div className="flex flex-col">
    <div className="order-2 sm:order-1">First on desktop</div>
    <div className="order-1 sm:order-2">First on mobile</div>
  </div>
  ```

### 4. Performance Considerations

- Use `hidden` instead of `display: none` when possible
- Lazy load images with responsive sizes
- Optimize chart rendering for mobile

### 5. Testing Checklist

- ✅ Test at each breakpoint (375px, 640px, 768px, 1024px, 1280px)
- ✅ Test landscape and portrait orientations
- ✅ Verify touch targets are large enough
- ✅ Check text readability at all sizes
- ✅ Ensure horizontal scroll is intentional
- ✅ Verify modals/dialogs fit on small screens
- ✅ Test keyboard navigation on desktop
- ✅ Check sidebar behavior on tablet

---

## Common Responsive Patterns Summary

| Pattern        | Mobile       | Tablet        | Desktop      |
| -------------- | ------------ | ------------- | ------------ |
| **Cards**      | 1 column     | 2 columns     | 4-5 columns  |
| **Forms**      | Stacked      | Stacked       | Side-by-side |
| **Sidebar**    | Overlay      | Overlay/Fixed | Fixed        |
| **Navigation** | Hamburger    | Tabs          | Full menu    |
| **Typography** | Smaller      | Medium        | Larger       |
| **Spacing**    | Compact      | Medium        | Spacious     |
| **Tables**     | Scroll/Stack | Scroll        | Full         |
| **Modals**     | Full-width   | Max-width     | Max-width    |

### Common Responsive Patterns

#### 1. Mobile-First Layout

```tsx
// Flex direction
<div className="flex flex-col sm:flex-row">

// Grid columns
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">

// Width
<div className="w-full md:w-1/2 lg:w-1/3">

// Spacing
<div className="gap-2 sm:gap-3 md:gap-4">
```

#### 2. Visibility Control

```tsx
// Hide on mobile, show on desktop
<div className="hidden md:block">

// Show on mobile, hide on desktop
<div className="md:hidden">

// Show on large screens only
<div className="hidden lg:flex">
```

#### 3. Typography Scaling

```tsx
<h1 className="text-subBody sm:text-body md:text-header">Responsive Heading</h1>
```

#### 4. Icon Sizing

```tsx
<Icon className="h-5 w-5 md:h-6 md:w-6 lg:h-8 lg:w-8" />
```

#### 5. Navigation Patterns

```tsx
// Desktop: Fixed sidebar
// Mobile: Overlay with backdrop
{
  Toggle && (
    <div className="lg:hidden fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/40" onClick={closeMenu} />
      <Sidebar />
    </div>
  );
}
```

---

## Animation System

### Keyframe Animations

Defined in `tailwind.config.ts`:

```typescript
// Fade and slide animations
"fade-in": "0%: opacity-0, translateY(10px) → 100%: opacity-1, translateY(0)"
"slide-in": "0%: opacity-0, translateX(-10px) → 100%: opacity-1, translateX(0)"
"scale-in": "0%: opacity-0, scale(0.95) → 100%: opacity-1, scale(1)"

// Loading animations
"shimmer": "backgroundPosition: -200% → 200%"
"pulse-slow": "opacity: 1 → 0.5 → 1 (2s)"

// Chart animations
"bar-rise": "scaleY(0) → scaleY(1) (0.6s)"
"bar-swipe": "scaleX(0) → scaleX(1) (0.8s)"
"line-pulse": "opacity: 0.6 → 1 → 0.6 (2s)"
"line-glow": "opacity: 0.4, scale(1) → opacity: 1, scale(1.2) (2s)"
"line-updown": "translateY(0) → translateY(-5px) → translateY(0) (3s)"

// Accordion
"accordion-down": "height: 0 → var(--radix-accordion-content-height)"
"accordion-up": "height: var(--radix-accordion-content-height) → 0"
```

### Usage Examples

```tsx
// Card entrance
<Card className="animate-fade-in">

// Loading skeleton
<div className="animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200">

// Chart bars
<Bar animationDuration={600} className="animate-bar-rise" />

// Slow pulse for emphasis
<div className="animate-pulse-slow">New Feature</div>
```

---

## Utility Functions

### Core Utilities (`src/lib/utils.tsx`)

#### 1. Class Name Merger

```tsx
import { cn } from "@/lib/utils";

// Merge Tailwind classes safely (handles conflicts)
<div className={cn("text-body", className)} />
<Button className={cn("bg-primary", isActive && "bg-secondary")} />
```

#### 2. Number Formatting

```tsx
// Format numbers with K/M/B suffix
formatNumber(1500); // "1.5K"
formatNumber(2500000); // "2.5M"
formatNumber(3000000000); // "3.0B"

// Format with percentage
formatAxisValue(75, true); // "75%"
formatAxisValue(1500, false); // "1.5K"
```

#### 3. Chart Utilities

```tsx
// Custom legend
<CustomLegendContent
  labels={["Clicks", "Impressions"]}
  colors={["#8B5CF6", "#3B82F6"]}
  isFullscreen={false}
/>

// Clickable axis ticks
<XAxis
  tick={<ClickableXAxisTick
    chartData={data}
    onDataClick={(item, index) => console.log(item)}
    isFullscreen={false}
  />}
/>

// Stacked bar with rounded corners and gaps
<Bar
  dataKey="value"
  shape={getStackedBarShape(0, true)}
/>
```

#### 4. Export Data

```tsx
// Export CSV
handleExportData(
  ["Name", "Value", "Date"], // Headers
  [["John", 100, "2024-01-01"]], // Rows
  "analytics-report.csv", // Filename
);
```

---

## Form Patterns

### Input Components

```tsx
// Standard input
<Input
  type="text"
  placeholder="Enter value..."
  className="text-subBody"
/>

// Select dropdown
<Select>
  <SelectTrigger className="text-subBody">
    <SelectValue placeholder="Select option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="1">Option 1</SelectItem>
    <SelectItem value="2">Option 2</SelectItem>
  </SelectContent>
</Select>

// Date picker (with context)
<MFDateRangePicker />

// Multi-select
<MultiSelect
  options={options}
  selected={selected}
  onChange={setSelected}
  placeholder="Select multiple..."
/>
```

### Form Layout

```tsx
<form className="space-y-4">
  <div className="space-y-2">
    <Label htmlFor="email" className="text-subBody">
      Email
    </Label>
    <Input id="email" type="email" className="text-body" />
  </div>

  <div className="flex gap-2 justify-end">
    <Button variant="outline">Cancel</Button>
    <Button type="submit">Submit</Button>
  </div>
</form>
```

---

## Chart Components

### Styling Guidelines

#### 1. Chart Container

```tsx
<Card>
  <CardHeader className="pb-3">
    <CardTitle className="text-header">Chart Title</CardTitle>
  </CardHeader>
  <CardContent className="chart-card-content">
    <ResponsiveContainer width="100%" height={300}>
      {/* Chart */}
    </ResponsiveContainer>
  </CardContent>
</Card>
```

#### 2. Chart Configuration

```tsx
// Colors from design system
const chartColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

// Recharts configuration
<BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="label" tick={{ fontSize: 12 }} angle={0} />
  <YAxis
    tick={{ fontSize: 12 }}
    tickFormatter={(value) => formatNumber(value)}
  />
  <Tooltip
    contentStyle={{ fontSize: 12 }}
    labelFormatter={(label) => <div className="text-subBody">{label}</div>}
  />
  <Bar
    dataKey="value"
    fill="hsl(var(--chart-1))"
    radius={[4, 4, 0, 0]}
    animationDuration={600}
  />
</BarChart>;
```

#### 3. Chart Animations

```tsx
// Bar animation
<Bar
  animationDuration={600}
  animationBegin={0}
/>

// Line animation
<Line
  type="monotone"
  strokeWidth={2}
  animationDuration={800}
  className="animate-line-pulse"
/>
```

---

## Dark Mode

### Implementation

```tsx
// Toggle theme
const { isDarkMode, toggleTheme } = useTheme();

<Button onClick={toggleTheme} variant="ghost" size="icon">
  {isDarkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
</Button>;
```

### Dark Mode Classes

```tsx
// Background and text
<div className="bg-background text-foreground">

// Card with dark mode
<Card className="bg-card dark:bg-card">

// Text colors
<p className="text-body dark:text-white">

// Borders
<div className="border border-border dark:border-gray-700">

// Buttons
<Button className="dark:text-white">
```

---

## Custom Utilities & Helpers

### Scrollbar Styling

```tsx
// Hide scrollbar
<div className="no-scrollbar overflow-auto">

// Custom styled scrollbar
<div className="scrollbar overflow-auto">
```

### Truncation with Tooltip

```tsx
<EllipsisTooltip text="Very long text that needs truncation" />

<TruncatedText
  text="Long text"
  maxLength={20}
  className="text-subBody"
/>
```

### Clipboard Copy

```tsx
// Custom pattern in codebase
const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
  toast({ title: "Copied!", description: "Text copied to clipboard" });
};
```

---

## Best Practices

### 1. Component Creation

- Use shadcn/ui components as base building blocks
- Create feature-specific components in `components/mf/`
- Use CVA for variant-based components
- Always export component types

### 2. Styling

- Mobile-first responsive design (use `sm:`, `md:`, `lg:` prefixes)
- Use semantic color tokens (`primary`, `secondary`, etc.) instead of hardcoded colors
- Use custom typography scale (`text-header`, `text-subBody`, etc.)
- Apply `dark:` variants for dark mode support
- Use `cn()` utility for conditional classes

### 3. State Management

- Use React Context for global UI state (theme, menu, package selection)
- Use TanStack Query for server state
- Store preferences in localStorage with Context providers
- Keep component state local when possible

### 4. Accessibility

- Use semantic HTML elements
- Include ARIA attributes (provided by Radix UI)
- Ensure keyboard navigation support
- Maintain focus management in dialogs/popovers
- Provide meaningful alt text for icons/images

### 5. Performance

- Use `React.memo()` for expensive components
- Memoize callbacks with `useCallback`
- Memoize computed values with `useMemo`
- Lazy load route components
- Optimize chart rendering with proper keys

### 6. Typography

- **Headers**: `text-header` (20px) for main titles
- **Body text**: `text-body` (14px) for paragraphs and descriptions
- **Labels**: `text-subBody` (12px) for form labels, filters, small text
- **Buttons**: `text-smallFont` (9.6px) - default button text size
- Always pair with appropriate font weights (`font-medium`, `font-semibold`)

### 7. Spacing

- Use consistent spacing scale: `space-y-2`, `space-y-4`, `space-y-6`
- Card padding: `p-4` for small cards, `p-6` for large cards
- Section gaps: `gap-4` for desktop, `gap-2` for mobile
- Use `chart-card-content` class for chart-specific padding

### 8. Animations

- Use built-in animations for UI feedback
- Chart animations: 600-800ms duration
- Page transitions: `animate-fade-in`
- Loading states: `animate-shimmer` or `animate-pulse-slow`
- Keep animations smooth and purposeful

---

## Common Component Examples

### 1. Information Card

```tsx
<Card className="animate-fade-in">
  <CardHeader className="pb-3">
    <CardTitle className="text-header flex items-center gap-2">
      <Icon className="h-5 w-5 text-primary" />
      Card Title
    </CardTitle>
    <CardDescription className="text-body">
      Brief description of the card content
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    <div className="flex justify-between items-center">
      <span className="text-subBody text-muted-foreground">Label</span>
      <span className="text-body font-semibold">Value</span>
    </div>
  </CardContent>
  <CardFooter className="flex gap-2">
    <Button variant="outline" size="sm">
      Action
    </Button>
  </CardFooter>
</Card>
```

### 2. Data Table

```tsx
<Card>
  <CardHeader>
    <CardTitle className="text-header">Table Title</CardTitle>
  </CardHeader>
  <CardContent>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-subBody">Column 1</TableHead>
          <TableHead className="text-subBody">Column 2</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="text-body">{row.name}</TableCell>
            <TableCell className="text-body">{row.value}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </CardContent>
</Card>
```

### 3. Dialog/Modal

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent className="sm:max-w-[600px]">
    <DialogHeader>
      <DialogTitle className="text-header">Dialog Title</DialogTitle>
      <DialogDescription className="text-body">
        Dialog description text
      </DialogDescription>
    </DialogHeader>

    <div className="space-y-4 py-4">{/* Content */}</div>

    <DialogFooter>
      <Button variant="outline" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      <Button onClick={handleSubmit}>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### 4. Loading Skeleton

```tsx
<Card className="space-y-3 p-4">
  <Skeleton className="h-6 w-3/4 animate-shimmer" />
  <Skeleton className="h-4 w-1/2" />
  <Skeleton className="h-32 w-full" />
  <div className="flex gap-2">
    <Skeleton className="h-10 w-20" />
    <Skeleton className="h-10 w-20" />
  </div>
</Card>
```

### 5. Badge with Status

```tsx
// Status indicator
<Badge variant={status === 'active' ? 'default' : 'secondary'}>
  {status}
</Badge>

// Count badge
<Badge variant="outline" className="text-subBody">
  {count} items
</Badge>
```

---

## File Paths Reference

### Core Configuration

- **Tailwind Config**: `tailwind.config.ts`
- **Global Styles**: `src/app/globals.css`
- **shadcn Config**: `components.json`
- **Utilities**: `src/lib/utils.tsx`

### Layout Components

- **Root Layout**: `src/app/layout.tsx`
- **Authenticated Layout**: `src/app/(web)/layout.tsx`
- **Top Bar**: `src/components/mf/MFTopBar.tsx`
- **Sidebar**: `src/components/mf/MFWebFraudAsideMenu.tsx`

### UI Components

- **Base UI**: `src/components/ui/` (52 components)
- **Business Components**: `src/components/mf/` (61+ components)
- **Charts**: `src/components/mf/charts/` (16 chart components)
- **Forms**: `src/components/mf/forms/`

### Context Providers

- **Theme**: `src/components/mf/theme-context.tsx`
- **Package**: `src/components/mf/PackageContext.tsx`
- **Date Range**: `src/context/DateRangeContext.tsx`
- **Menu**: `src/context/MenuContext.tsx`

---

## Quick Start Checklist

When creating a new component:

1. ✅ Use appropriate base component from `src/components/ui/`
2. ✅ Apply semantic color tokens (primary, secondary, etc.)
3. ✅ Use custom typography scale (text-header, text-subBody, etc.)
4. ✅ Add dark mode support with `dark:` variants
5. ✅ Make it responsive with `sm:`, `md:`, `lg:` breakpoints
6. ✅ Use `cn()` utility for className merging
7. ✅ Add animations where appropriate
8. ✅ Follow consistent spacing patterns
9. ✅ Ensure accessibility (ARIA, keyboard nav)
10. ✅ Export TypeScript types

---

## Summary

This frontend design system provides:

- **Consistent color palette** with light/dark mode support
- **Typography scale** optimized for data-heavy interfaces
- **52+ reusable UI components** from shadcn/ui
- **Comprehensive animation system** for smooth interactions
- **Responsive design patterns** for mobile-first development
- **Utility functions** for common operations
- **Best practices** for maintainable, accessible code

Always prioritize:

- Component reusability
- Accessibility
- Performance
- Dark mode compatibility
- Mobile-first responsive design
- Type safety with TypeScript

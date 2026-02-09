# UI Design Standards & Component Library

> **Purpose:** This doc defines the visual design system for CoCRM. All screens in `16_UI_Screens.md` must use these tokens, components, and patterns.
>
> **Design Language:** Tailwind CSS + shadcn/ui. Clean, minimal, mobile-first.
>
> **Font:** Inter (Body/UI) + Outfit (Headings). Implemented via `@fontsource`.

---

## 1. Color System (Tailwind + CSS Variables)

We use a semantic color system based on shadcn/ui conventions. Define these in `apps/web/src/index.css`.

### 1.1 Brand Palette

| Token | CSS Variable | Hex (Approx) | Usage |
|-------|--------------|--------------|-------|
| `primary` | `--primary` | `#1565C0` (Blue 800) | Main buttons, active states, branding |
| `primary-foreground` | `--primary-foreground` | `#FFFFFF` | Text on primary button |
| `secondary` | `--secondary` | `#F1F3F5` (Grey 100) | Secondary buttons, chips, backgrounds |
| `secondary-foreground` | `--secondary-foreground` | `#1F2937` (Grey 800) | Text on secondary elements |
| `destructive` | `--destructive` | `#DC2626` (Red 600) | Delete actions, error states |
| `background` | `--background` | `#F8F9FA` (Grey 50) | App background color |
| `card` | `--card` | `#FFFFFF` | Card background |
| `muted` | `--muted` | `#F3F4F6` (Grey 100) | Muted backgrounds |
| `muted-foreground` | `--muted-foreground` | `#6B7280` (Grey 500) | Subtitles, help text |
| `border` | `--border` | `#E5E7EB` (Grey 200) | Borders, dividers |

### 1.2 Status Colors (Tailwind Classes)

| Status | Bg Class | Text Class | Border Class |
|--------|----------|------------|--------------|
| **New** | `bg-blue-50` | `text-blue-700` | `border-blue-200` |
| **Hot** | `bg-red-50` | `text-red-700` | `border-red-200` |
| **Warm** | `bg-orange-50` | `text-orange-700` | `border-orange-200` |
| **Cold** | `bg-gray-100` | `text-gray-600` | `border-gray-200` |
| **Won** | `bg-green-50` | `text-green-700` | `border-green-200` |

### 1.3 Chat Bubble Colors

* **Outbound (Me):** `bg-primary text-primary-foreground` (Blue)
* **Inbound (Lead):** `bg-white text-gray-800 border border-border`
* **Draft (AI):** `bg-amber-50 border-amber-200 text-amber-900`

---

## 2. Typography System

**Font Family:**
* Headings: `Outfit` (sans-serif)
* Body: `Inter` (sans-serif)

**Usage via Tailwind Classes:**

| Context | Class | Size/Weight |
|---------|-------|-------------|
| **H1** (Page Title) | `text-2xl font-bold font-heading` | 24px / 700 |
| **H2** (Section/Dialog) | `text-xl font-semibold font-heading` | 20px / 600 |
| **H3** (Card Title) | `text-base font-semibold font-heading` | 16px / 600 |
| **Body Large** (Chat) | `text-base font-normal` | 16px / 400 |
| **Body Base** (Default) | `text-sm font-normal` | 14px / 400 |
| **Small** (Subtitle) | `text-xs text-muted-foreground` | 12px / 400 |
| **Label** (Button) | `text-sm font-medium` | 14px / 500 |

---

## 3. Spacing & Layout

**Base Unit:** 4px (Tailwind standard).

| Token | Size | Class | Usage |
|-------|------|-------|-------|
| `gap-1` | 4px | `gap-1` | Tight icons/text |
| `gap-2` | 8px | `gap-2` | List items, buttons |
| `gap-3` | 12px | `gap-3` | Form fields |
| `gap-4` | 16px | `gap-4` | Card padding, standard gap |
| `gap-6` | 24px | `gap-6` | Sections |
| `p-4` | 16px | `p-4` | Container padding |

**Border Radius:**
* `rounded-md` (6px): Inputs, buttons.
* `rounded-lg` (8px): Cards, dialogs.
* `rounded-full`: Avatars, badges.

---

## 4. Component Library (shadcn/ui)

All components live in `apps/web/src/components/ui`.

### 4.1 Buttons (`<Button />`)

| Variant | Props | Usage |
|---------|-------|-------|
| **Primary** | `variant="default"` | Main CTA ("Start Trial") |
| **Secondary** | `variant="outline"` | Cancel, Back, Edit |
| **Ghost** | `variant="ghost"` | Icon buttons, overflow menu |
| **Destructive** | `variant="destructive"` | Delete, Remove |

**Mobile Rule:** Buttons should be full width (`w-full`) in bottom sheets and mobile forms. Primary actions always at the bottom.

### 4.2 Cards (`<Card />`)

```tsx
<Card className="p-4 border shadow-sm">
  <div className="flex justify-between items-start">
    <div className="flex gap-3">
      <Avatar className="h-10 w-10">
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
      <div>
        <h3 className="font-semibold">John Doe</h3>
        <p className="text-sm text-muted-foreground">Kyiv, Ukraine</p>
      </div>
    </div>
    <Badge variant="outline">New</Badge>
  </div>
</Card>
```

### 4.3 Inputs (`<Input />`, `<Textarea />`)

* Standard tailwind styling: `h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm`.
* Focus ring: `ring-2 ring-ring ring-offset-2`.

### 4.4 Badges / Chips (`<Badge />`)

Use `Badge` component for status and priority.

```tsx
<Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100">
  New
</Badge>
```

### 4.5 Dialogs & Sheets

* **Dialog (`<Dialog />`):** For alerts and confirmations.
* **Sheet (`<Sheet />`):** For forms, details, filters. Side-drawer on desktop, bottom-sheet on mobile (using `vaul` or responsive sheet pattern).

### 4.6 Toasts (`sonner`)

Use `sonner` for toast notifications.

```tsx
toast.success('Leads imported successfully');
toast.error('Failed to update status');
```

---

## 5. Icons (Lucide React)

Use `lucide-react` for all icons.
* Size: default 16px or 20px (`w-4 h-4` or `w-5 h-5`).
* Color: `text-muted-foreground` for non-interactive icons.

---

## 6. Shared Patterns

### 6.1 Empty State

```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <div className="bg-muted rounded-full p-4 mb-4">
    <Search className="w-8 h-8 text-muted-foreground" />
  </div>
  <h3 className="text-lg font-semibold">No leads found</h3>
  <p className="text-sm text-muted-foreground max-w-xs mt-1 mb-4">
    Try adjusting your search filters or add a new lead manually.
  </p>
  <Button>Find Leads</Button>
</div>
```

### 6.2 Loading Skeleton

Use `<Skeleton />` component.

```tsx
<div className="flex items-center gap-4">
  <Skeleton className="h-12 w-12 rounded-full" />
  <div className="space-y-2">
    <Skeleton className="h-4 w-[200px]" />
    <Skeleton className="h-4 w-[150px]" />
  </div>
</div>
```

### 6.3 Page Layout (Mobile)

* **Header:** Sticky top, `h-14 border-b bg-background/95 backdrop-blur`.
* **Content:** `flex-1 overflow-y-auto p-4`.
* **Footer:** Fixed bottom (if needed) or Bottom Nav.

---

# Food Ordering PWA - Design Guidelines

## Design Approach

**Dual-Interface Strategy**: Reference-based design drawing from leading food delivery platforms (Uber Eats, DoorDash) for customer experience and productivity tools (Linear, Notion) for admin panel.

**Customer Interface**: Visual-first, appetite-driven design with immersive food imagery
**Admin Panel**: Clean, efficient dashboard prioritizing quick actions and real-time updates

---

## Customer Ordering Interface

### Layout Architecture
**Header**: Fixed top navigation with logo (left), location selector (center), cart icon with badge count (right). Height: h-16, backdrop blur on scroll.

**Hero Section**: Full-width banner showcasing signature dishes or daily specials. Use vibrant, appetizing food photography. Height: 60vh on desktop, 40vh on mobile. Include search bar overlay with blurred background for "Search dishes, cuisines..." input.

**Menu Categories**: Horizontal scrollable pill navigation below hero (sticky on scroll). Categories: "All", "Bestsellers", "Appetizers", "Main Course", "Desserts", "Beverages". Active category highlighted with subtle background.

**Food Grid**: 3-column grid on desktop (lg:grid-cols-3), 2-column on tablet (md:grid-cols-2), single column on mobile. Each card includes:
- High-quality food image (aspect-ratio-square)
- Dish name (font-semibold, text-lg)
- Brief description (text-sm, text-gray-600, 2-line clamp)
- Price (font-bold, text-xl)
- Add to cart button (bottom-right, floating over image)

**Spacing System**: Use Tailwind units of 4, 6, and 8 primarily. Section padding: py-8 mobile, py-12 desktop. Card gaps: gap-6.

### Cart Experience
**Slide-over Panel**: Right-side drawer (w-96) with:
- Cart items list with thumbnail, name, quantity controls, price
- Subtotal, taxes, delivery fee breakdown
- Prominent checkout button (sticky bottom)
- Empty state with illustration when cart is empty

### Typography Hierarchy
- **Headings**: Font family from Google Fonts (e.g., "Poppins" or "Inter")
  - H1: text-4xl font-bold (Hero headlines)
  - H2: text-2xl font-semibold (Section titles)
  - H3: text-xl font-semibold (Card titles)
- **Body**: text-base for descriptions, text-sm for metadata
- **Buttons**: text-sm font-medium, uppercase tracking-wide

---

## Admin Panel

### Dashboard Layout
**Sidebar Navigation**: Fixed left sidebar (w-64) with:
- Logo/branding at top
- Navigation items: Dashboard, Orders, Menu Items, Users & Roles, Settings
- Each item with icon (use Heroicons) and label
- Logout button at bottom

**Main Content Area**: ml-64 to accommodate sidebar
- **Top Bar**: Breadcrumb navigation (left), notification bell, user profile (right). Height: h-16.
- **Content Grid**: 12-column grid system for flexible layouts

### Orders Dashboard
**Real-Time Order Cards**: Grid layout (grid-cols-1 lg:grid-cols-3) showing:
- New Orders (Pending status)
- In Progress (Preparing)
- Ready for Pickup/Delivery

Each order card includes:
- Order number (large, bold at top)
- Customer name and contact
- Order items list (compact, scrollable if many)
- Total amount
- Time elapsed since order
- Action buttons (Accept, Reject for new; Mark Ready, Cancel for in-progress)

**Sound Notification**: Visual indicator for audio enabled/disabled in top bar.

### Menu Management
**Table View**: Data table with columns:
- Image thumbnail
- Item name
- Category
- Price
- Availability toggle
- Actions (Edit, Delete icons)

**Add/Edit Form**: Modal or slide-over with:
- Image upload area (drag-and-drop zone)
- Name, description, price inputs
- Category dropdown
- Dietary tags (checkboxes for vegetarian, vegan, gluten-free)
- Availability toggle

### Role Management
**User Table**: Similar structure to menu management
- User avatar/name
- Email
- Role badge (Admin/Manager/Staff with distinct visual treatment)
- Status (Active/Inactive)
- Edit/Delete actions

---

## Component Library

### Buttons
- **Primary**: Rounded corners (rounded-lg), medium padding (px-6 py-3)
- **Secondary**: Outlined variant with border
- **Icon Buttons**: Square (h-10 w-10), rounded-full for cart/profile

### Forms
- **Input Fields**: Full border (border), rounded (rounded-lg), padding (px-4 py-3)
- **Focus States**: Ring treatment for accessibility
- **Labels**: Above inputs, text-sm font-medium

### Cards
- **Elevation**: Subtle shadow (shadow-md), hover lift (hover:shadow-lg transition)
- **Padding**: p-6 for content
- **Borders**: Rounded (rounded-xl)

### Badges
- **Status Indicators**: Pill-shaped (rounded-full), small text (text-xs), padding (px-3 py-1)
- **Count Badges**: Circular, absolute positioning on icons

---

## PWA-Specific Design

### Offline State
- **Banner**: Top notification when offline (fixed position, backdrop)
- **Disabled Actions**: Visual treatment for unavailable features when offline
- **Cached Content**: Indicate which items are available offline

### Install Prompt
- **Banner or Modal**: Encourage users to install app after 2-3 visits
- **Benefits**: "Add to Home Screen for faster access"

---

## Images

**Hero Image**: Large, appetizing food photography showcasing restaurant's best dishes. Should evoke hunger and quality. Minimum 1920x1080px resolution.

**Menu Item Images**: Square format (600x600px minimum), well-lit professional food photography with garnishes and plating visible.

**Admin Panel**: No decorative images. Focus on icons (Heroicons library) for navigation and actions.

**Empty States**: Simple illustration or icon for empty cart, no orders, etc.

---

## Animation Principles

**Minimal Motion**: Use sparingly
- Cart icon shake when item added
- Slide transitions for cart drawer
- Fade-in for new order notifications in admin
- No scroll-based animations

---

## Accessibility

- All form inputs with proper labels
- Sufficient color contrast (WCAG AA minimum)
- Keyboard navigation throughout
- Screen reader announcements for cart updates and new orders
- Focus indicators on all interactive elements

This design balances visual appeal for customers with operational efficiency for admin users, creating a cohesive yet purpose-driven dual interface.
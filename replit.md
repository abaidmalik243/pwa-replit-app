# Food Ordering PWA - Kebabish Pizza

## Overview

Kebabish Pizza is a multi-branch food ordering Progressive Web Application (PWA) designed for a restaurant chain in Pakistan. It features a customer-facing ordering system and a comprehensive Point of Sale (POS) system with administrative management. The application enables customers to browse menus, place orders, and track deliveries, while providing restaurant staff with a full-featured POS system including order entry, table management, kitchen display, cash register sessions, payment processing, discount management, and detailed reporting. Built as a full-stack TypeScript solution, it focuses on responsive design, real-time updates, and role-based access control, aiming to enhance both the food ordering experience and streamline restaurant operations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Technology Stack

**Frontend**: React with TypeScript, Vite, shadcn/ui (Radix UI), Tailwind CSS, Wouter for routing, TanStack Query for server state, React Hook Form with Zod for form handling.
**Backend**: Express.js with TypeScript.
**Database**: PostgreSQL with Drizzle ORM, utilizing Neon Serverless PostgreSQL.

### Database Architecture

The application uses a relational database with UUID primary keys. Core entities include:
- **Branches**: Multi-location support with delivery areas, GPS coordinates, branding, and active status.
- **Users**: Authentication and role-based access control (admin, staff, customer) with feature-based permissions and branch assignment.
- **Categories**: Menu organization with images and descriptions.
- **Menu Items**: Product catalog with pricing, descriptions, images, and availability.
- **Orders**: Order management with customer info, item details, status tracking, timestamps, and POS-specific fields (tableId, sessionId, orderSource, paymentStatus, discount).
- **Expenses**: Financial tracking by branch with categories and date-based reporting.
- **POS Tables**: Dine-in table management with status, capacity, section grouping, and order assignment.
- **POS Sessions**: Cash register session tracking with opening/closing cash, sales totals, payment method breakdowns, and variance calculation.
- **Kitchen Tickets**: Order ticket management for kitchen display with preparation status.

### Authentication System

Features Bcrypt hashing for passwords, cookie-based session management, and role-based access control (admin, staff, customer) with protected routes. Client-side route protection uses a `ProtectedRoute` component.

### API Architecture

RESTful Express.js endpoints under `/api` handle JSON requests/responses. Key routes include authentication (`/api/auth/signup`, `/api/auth/login`) and resource management (`/api/categories`, `/api/branches`, `/api/menu-items`, `/api/orders`, `/api/expenses`, `/api/users`). Includes custom middleware for request logging.

### Storage Layer

An `IStorage` interface in `server/storage.ts` abstracts CRUD operations, separating business logic from Drizzle ORM database access. Drizzle Kit manages schema migrations.

### Frontend Architecture

**Component Structure**: Reusable UI components (shadcn/ui), feature-specific components, page components, and custom hooks.
**Dual Interface Design**:
1.  **Customer Interface**: Visual-first design with order type/location selection, GPS-based nearest branch detection, hero slider, category filter, grid menu, slide-over cart, and responsive layout.
2.  **Admin Panel**: Productivity-focused design with fixed sidebar navigation, breadcrumbs, dashboard with real-time order cards, CRUD interfaces, inventory demand tracking, and sound notifications for new orders.
**State Management**: TanStack Query for server state, React `useState` for local UI state, React Hook Form with Zod for form state, and localStorage for user authentication state.

### PWA Features

Includes a web app manifest (`manifest.json`) for standalone display, theme colors, and icons. A service worker (`sw.js`) provides offline-first capabilities with network-first caching, precaching, dynamic caching, and an offline fallback page (`offline.html`) with reconnection detection. Supports installation to home screen and responsive design via Tailwind breakpoints.

### Real-Time Features

Admin dashboard includes Web Audio API-based notification sounds for new orders, using a custom sound generator with multi-tone patterns and a toggle for sound control.

### Development Workflow

Utilizes Vite dev server with HMR, shared TypeScript types between client and server, configured path aliases, and Replit-specific Vite plugins for error handling.

### Build and Deployment

Vite builds the client to `/dist/public`, and ESBuild bundles the TypeScript server to `/dist`. Express serves the compiled React app in production, with Vite middleware in development. Environment variables configure database connections.

### Seeding Strategy

An initial seed script creates three branches (Okara, Sahiwal, Faisalabad) with delivery areas and a default admin account.

### POS Module

The comprehensive Point of Sale (POS) system includes multiple integrated features:

**1. Order Entry Interface** (`/admin/pos`):
- Quick menu item selection with grid/list view toggle
- Item customization dialog for variants and special instructions
- Shopping cart management with quantity adjustment
- Order type selection (dine-in, takeaway, delivery)
- Table pre-selection via URL parameter for dine-in orders
- Customer information capture
- Real-time session detection and validation
- Automatic payment dialog trigger after order creation

**2. Table Management** (`/admin/pos-tables`):
- Visual floor plan with color-coded table status (available, occupied, reserved)
- Section-based grouping (Main Dining, Patio, VIP)
- Table capacity and number display
- Quick order creation with table pre-selection
- Real-time status updates
- "Create Order" action navigates to POS with table pre-filled

**3. Kitchen Display System** (`/admin/kitchen`):
- Real-time order monitoring for POS orders
- Status progression workflow (pending → preparing → ready → served)
- Order timer showing elapsed time since creation
- Status filter (all, pending, preparing, ready)
- Web Audio API notification sounds for new orders with toggle control
- Sound-enabled visual indicator
- Branch-filtered order display
- Auto-refresh every 5 seconds

**4. Cash Register / Session Management** (`/admin/pos-sessions`):
- Session lifecycle management (open/close)
- Opening cash declaration
- Closing cash count with variance calculation
- Session history with date filtering
- Sales summary per session (total sales, order count)
- Payment method breakdown (cash, card, JazzCash sales)
- Status badges (open/closed)
- Notes field for session discrepancies

**5. Payment Processing**:
- Multi-method support (Cash, Card, JazzCash)
- Single payment mode with automatic total calculation for non-cash
- Cash payment with change calculation
- Split payment mode for multiple payment methods
- Payment amount validation
- Visual payment method selection with icons
- Payment details stored in order notes
- Backend endpoint: `POST /api/orders/:id/payment`

**6. Discount Management**:
- Percentage-based discounts (e.g., 10% off)
- Fixed amount discounts (e.g., PKR 100 off)
- Discount reason tracking (loyalty, manager approval, etc.)
- Real-time total recalculation
- Discount preview before application
- Maximum discount validation (cannot exceed subtotal)
- Backend endpoint: `POST /api/orders/:id/discount`
- DiscountDialog component reusable across POS screens

**7. Reporting Dashboard** (`/admin/pos-reports`):
- Date range filtering (today, yesterday, last 7 days, last 30 days)
- Key metrics: total sales, order count, average order value, session count
- Payment method breakdown with order counts and totals
- Order status distribution
- Top 5 popular items by quantity sold
- Session-based sales aggregation
- Visual cards for key performance indicators

**8. Branch Switcher & Multi-Location Management**:
- Admin header includes branch switcher dropdown for multi-location oversight
- "All Branches" option allows viewing aggregated data across all locations
- View modes:
  - **Specific Branch**: Full access to all POS operations (orders, sessions, tables)
  - **All Branches**: Read-only mode for reports, kitchen display, sessions history, and tables
- Restrictions in "All Branches" mode:
  - Cannot create orders (POS page requires specific branch)
  - Cannot open new sessions
  - Cannot add new tables
  - Action buttons replaced with "Viewing All Branches" badge
- Branch selection persists in localStorage for session continuity
- All data queries automatically filter by selected branch or fetch all when "all" is selected

**POS Backend Endpoints**:
- `POST /api/orders/:id/status` - Update order status (Kitchen Display)
- `POST /api/orders/:id/payment` - Process payment
- `POST /api/orders/:id/discount` - Apply discount
- `POST /api/pos/sessions/:id/close` - Close cash register session
- All endpoints fetch authoritative data before updates to maintain consistency

**Known Limitations** (documented per user request - Option A):
- Kitchen Display and Session Management use full order/session spreading during updates, which can cause stale data in concurrent scenarios
- Payment endpoint appends to notes field instead of dedicated payment_details column
- No WebSocket implementation; relies on polling for real-time updates
- These limitations are documented for future architectural refactoring

## External Dependencies

### UI Component Libraries
- **Radix UI**: Unstyled, accessible component primitives.
- **shadcn/ui**: Pre-styled component collection built on Radix UI with Tailwind CSS.

### Styling and Design
- **Tailwind CSS**: Utility-first CSS framework.
- **class-variance-authority**: Type-safe variant styling.
- **clsx & tailwind-merge**: Utilities for class name merging.

### Form Management
- **React Hook Form**: Form library with validation.
- **Zod**: TypeScript-first schema validation.
- **@hookform/resolvers**: Validation resolver for React Hook Form.

### Data Fetching
- **TanStack Query (React Query)**: Server state management.

### Database and ORM
- **Drizzle ORM**: TypeScript ORM.
- **@neondatabase/serverless**: Neon PostgreSQL serverless driver.
- **drizzle-kit**: Schema management and migration tool.
- **drizzle-zod**: Automatic Zod schema generation.

### Authentication
- **bcrypt**: Password hashing.
- **connect-pg-simple**: PostgreSQL session store for Express.

### Utilities
- **date-fns**: Date manipulation.
- **nanoid**: Unique ID generation.
- **cmdk**: Command menu component.

### Development Tools
- **Vite**: Build tool and development server.
- **TypeScript**: Type-safe JavaScript.
- **tsx**: TypeScript execution for Node.js.
- **ESBuild**: JavaScript bundler.
- **PostCSS**: CSS processing.
- **@replit/vite-plugin-***: Replit-specific development plugins.

### Fonts
- **Google Fonts**: Multiple font families (Architects Daughter, DM Sans, Fira Code, Geist Mono).
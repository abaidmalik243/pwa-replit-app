# Food Ordering PWA - Kebabish Pizza

## Overview

Kebabish Pizza is a multi-branch Progressive Web Application (PWA) for a restaurant chain. It integrates a customer ordering system with loyalty programs, a Point of Sale (POS) for staff, inventory management, and payment processing. The application aims to enhance customer experience and streamline multi-branch operations through responsive design, real-time updates, and role-based access. Key capabilities include customer accounts, real-time order management, kitchen display system, delivery management with rider tracking, and comprehensive reporting.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Core Architectural Decisions

The system utilizes a relational database with UUID primary keys and supports role-based access control (admin, staff, customer, rider). A RESTful Express.js API handles authentication and resource management. Data persistence is managed via an `IStorage` interface abstracting Drizzle ORM, with Drizzle Kit for schema migrations. Real-time updates across all terminals are powered by Socket.IO integration, eliminating polling for events like order creation, status updates, and rider location.

### Technology Stack

**Frontend**: React with TypeScript, Vite, shadcn/ui (Radix UI), Tailwind CSS, Wouter, TanStack Query, React Hook Form with Zod.
**Backend**: Express.js with TypeScript.
**Database**: PostgreSQL with Drizzle ORM (Neon Serverless PostgreSQL).

### Frontend Architecture

The application features a dual interface: a visual-first Customer Interface and a productivity-focused Admin Panel with fixed sidebar navigation and real-time dashboards. State management uses TanStack Query for server state, React `useState` for local UI, React Hook Form for forms, and `localStorage` for authentication. It is built as a PWA with offline capabilities and a mobile-first responsive design using Tailwind CSS.

### Feature Specifications

**POS Module**: Integrates order entry, visual table management, real-time Kitchen Display System (KDS), cash register/session management, multi-method payment processing (Cash, Card, JazzCash), discount management, reporting, and branch switching.

**Menu Item Variant Management**: Allows complex menu item customization with configurable variant groups, options, and price modifiers.

**Customer Payment System**: Supports Cash on Delivery (COD) and JazzCash, with staff verification for JazzCash.

**Promotional Codes System**: Flexible promo code management via admin interface, supporting various discount types, usage limits, and time-based validity.

**Delivery Charges System**: Manages flexible delivery charges with static and dynamic pricing models, including distance-based calculations using OpenStreetMap Nominatim, free delivery thresholds, and estimated delivery times.

**Customer Accounts System**: Offers saved addresses, favorites, a loyalty points program, and order history with reorder functionality.

**Inventory Management System**: Features real-time stock tracking, automatic deduction, low stock alerts, supplier management, transaction history, and wastage tracking.

**Payment Processing System**: Supports multiple payment methods including Stripe card payments and JazzCash mobile wallet. It includes automated refunds for Stripe, manual for JazzCash, and comprehensive payment tracking.

**Rider Management System**: Provides CRUD for riders, automatic user account creation, real-time GPS tracking, automated delivery assignment, status management, performance tracking, and live admin dashboard with map visualization.

**JazzCash Admin Monitoring**: Admin dashboard at `/admin/jazzcash` for managing and monitoring JazzCash transactions, including configuration management, transaction history, statistics, and integration health.

**Advanced Analytics Dashboard**: Business intelligence dashboard at `/admin/analytics` offering insights into sales trends, customer behavior, product performance, peak hours analysis, and key performance indicators across various timeframes.

**Staff Shift & Schedule Management**: Workforce management system with automated scheduling, attendance tracking, and performance analytics. Includes shift scheduling, clock in/out, availability management, overtime tracking, and shift reports.

**WhatsApp Marketing & Promotional Campaigns**: Marketing automation for customer engagement via WhatsApp. Features campaign management, reusable message templates with personalization, customer segmentation, and campaign analytics.

**Multi-Language & Localization System**: Internationalization infrastructure supporting English, Urdu, and Arabic with RTL text, and multiple currencies (PKR, USD, AED, SAR). User preferences are stored in the backend and synchronized with local storage.

**Hierarchical Permissions System**: Granular role-based access control with 12 permission modules (Orders, Menu, Users & Roles, POS, Deliveries & Riders, Inventory & Suppliers, Marketing, Analytics & Reports, Loyalty & Customers, Expense Management, System Settings) containing 60+ individual permissions. Features accordion-based UI with module-level checkboxes, Select All/Clear All functionality, and responsive design for mobile devices. Permissions stored as text arrays using module.action format (e.g., "orders.view", "expenses.approve").

**Branch-Based Access Control**: Comprehensive branch filtering across all modules. Non-admin users (staff, riders) are automatically restricted to viewing only data from their assigned branch. Backend uses `requireBranchAccess()` helper which enforces branch access - throws 403 if non-admin user has no branchId assigned. Routes using branch filtering: orders, expenses, POS tables/sessions, shifts, riders, deliveries, inventory transactions. Admins can access all branches or filter by specific branchId.

**Expense Management System**: Daily expense tracking with 24-hour window filter (5:00 AM today to 4:59 AM tomorrow). Supports multiple categories including Rent, Utilities, Supplies, Salaries, Marketing, Maintenance, Transportation, Staff, and Other. When category is "Staff", a Staff Member dropdown appears populated with active staff from the selected branch. Expenses can link to staff members via optional `staffId` field. Admins bypass all permission checks and can manage expenses across all branches. Staff users are restricted to their assigned branch only.

**Saved Customers Module**: Admin dashboard at `/admin/customers` for comprehensive customer relationship management. Features include customer statistics overview (total customers, active customers, orders, revenue, tier distribution), searchable customer list with tier filtering and sorting options (by name, spent, orders). Detailed customer view dialog with tabs for Overview (stats, member info), Orders (order history), Addresses (saved addresses), Loyalty (points, tier, transactions, admin point adjustments), and Favorites (favorite menu items). Requires `loyalty.view_customers` permission for viewing and `loyalty.manage_points` for adjusting loyalty points. Accessible via Heart icon in sidebar navigation.

**Role-Specific Dashboards**: Three dedicated dashboards tailored for each user role, accessible from the main sidebar:
- **Admin Dashboard** (`/admin`): Full analytics, revenue charts, order management, KPIs. Admin-only access.
- **Staff Dashboard** (`/admin/staff-dashboard`): Simplified order workflow with pending/preparing/ready orders, upcoming shift assignments, attendance tracking. Accessible by staff and admin.
- **Rider Dashboard** (`/rider`): Delivery assignments, availability status, GPS tracking, performance stats. Accessible by rider and admin.
AdminSidebar uses a `roles` property on menu items to filter visibility. Admins can access all three dashboards; staff and riders see only their respective dashboards.

## Reusable UI Components

**PasswordInput** (`client/src/components/ui/password-input.tsx`): Input field with show/hide password toggle using Eye/EyeOff icons. Extends standard Input component with visibility toggle functionality.

**PaginationControls** (`client/src/components/ui/pagination-controls.tsx`): Reusable pagination component with page size selector, first/prev/next/last navigation buttons, and "Showing X to Y of Z items" display. Auto-handles edge cases when filtered data shrinks. Props: currentPage, totalPages, totalItems, pageSize, onPageChange, onPageSizeChange, pageSizeOptions, showPageSizeSelector.

**PageLoader** (`client/src/components/ui/page-loader.tsx`): Multiple loading state components:
- `PageLoader`: Full-page loading with optional message
- `TableLoader`: Table skeleton with configurable rows/columns
- `CardLoader`: Card grid skeleton
- `InlineLoader`: Inline spinner with text

## External Dependencies

-   **UI Component Libraries**: Radix UI, shadcn/ui
-   **Styling**: Tailwind CSS
-   **Form Management**: React Hook Form, Zod
-   **Data Fetching**: TanStack Query
-   **Database/ORM**: Drizzle ORM, @neondatabase/serverless
-   **Authentication**: bcrypt, connect-pg-simple
-   **Utilities**: date-fns, nanoid, cmdk
-   **Internationalization**: react-i18next, i18next, i18next-browser-languagedetector, i18next-http-backend
-   **Fonts**: Google Fonts
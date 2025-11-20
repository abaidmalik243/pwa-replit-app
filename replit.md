# Food Ordering PWA - Kebabish Pizza

## Overview

Kebabish Pizza is a multi-branch Progressive Web Application (PWA) for a restaurant chain, featuring a customer-facing ordering system and a comprehensive Point of Sale (POS) system. It enables customers to browse menus, place orders, and track deliveries. For staff, it provides order entry, table management, a kitchen display system, cash register sessions, payment processing, discount management, and detailed reporting. Built as a full-stack TypeScript solution, the application emphasizes responsive design, real-time updates, and role-based access control to enhance the ordering experience and streamline restaurant operations across multiple branches.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Technology Stack
**Frontend**: React with TypeScript, Vite, shadcn/ui (Radix UI), Tailwind CSS, Wouter, TanStack Query, React Hook Form with Zod.
**Backend**: Express.js with TypeScript.
**Database**: PostgreSQL with Drizzle ORM (Neon Serverless PostgreSQL).

### Database Architecture
A relational database with UUID primary keys supports entities like Branches, Users (with role-based access), Categories, Menu Items, Orders, Expenses, POS Tables, POS Sessions, and Kitchen Tickets.

### Authentication System
Features Bcrypt hashing, cookie-based session management, and role-based access control (admin, staff, customer) with protected routes.

### API Architecture
RESTful Express.js endpoints under `/api` handle JSON requests/responses for authentication and resource management, including custom middleware for request logging.

### Storage Layer
An `IStorage` interface abstracts CRUD operations, separating business logic from Drizzle ORM database access. Drizzle Kit manages schema migrations.

### Frontend Architecture
**Component Structure**: Reusable UI components (shadcn/ui), feature-specific components, page components, and custom hooks.
**Dual Interface Design**:
1.  **Customer Interface**: Visual-first, with order type/location selection, GPS-based nearest branch detection, hero slider, category filter, grid menu, slide-over cart, and responsive layout.
2.  **Admin Panel**: Productivity-focused with fixed sidebar navigation, breadcrumbs, real-time order dashboard, CRUD interfaces, inventory demand tracking, and sound notifications.
**State Management**: TanStack Query for server state, React `useState` for local UI, React Hook Form with Zod for forms, and `localStorage` for authentication.

### PWA Features
Includes a web app manifest for standalone display and a service worker for offline-first capabilities (network-first caching, precaching, dynamic caching, offline fallback page with reconnection detection).

### Responsive Design
All pages are fully responsive using a mobile-first approach with Tailwind CSS breakpoints. This includes adaptive layouts for the POS system (sidebar, menu grids, session history, table displays) and the customer interface (hero slider, category filters, menu grid, cart).

### Real-Time Features
The admin dashboard uses the Web Audio API for new order notifications with custom sound patterns and toggle control.

### POS Module
A comprehensive Point of Sale system integrates:
-   **Order Entry Interface**: Quick item selection, customization, cart management, order type, table pre-selection, customer info capture, and automatic payment dialog.
-   **Table Management**: Visual floor plan with color-coded status, section grouping, and quick order creation.
-   **Kitchen Display System**: Real-time order monitoring, status workflow (pending → preparing → ready → served), order timers, and new order notifications.
-   **Cash Register / Session Management**: Session lifecycle (open/close), cash declaration, variance calculation, history, sales summary, and payment method breakdowns.
-   **Payment Processing**: Multi-method support (Cash, Card, JazzCash) with single and split payment modes, change calculation, and validation.
-   **Discount Management**: Percentage or fixed amount discounts with reason tracking, real-time recalculation, and validation.
-   **Reporting Dashboard**: Date range filtering for key metrics (sales, orders, AOV), payment breakdown, order status distribution, and top-selling items.
-   **Branch Switcher & Multi-Location Management**: Admin header dropdown for multi-location oversight, "All Branches" read-only mode for reports, and branch-specific POS operations.

### Customer Payment System
Supports **Cash on Delivery (COD)** and **JazzCash**. The JazzCash flow involves customer selection, order creation with pending status, a dialog for payment instructions, transaction ID/payer phone collection, and submission for manual staff verification, updating order status to "awaiting_verification."

## External Dependencies

### UI Component Libraries
-   Radix UI
-   shadcn/ui

### Styling and Design
-   Tailwind CSS
-   class-variance-authority
-   clsx & tailwind-merge

### Form Management
-   React Hook Form
-   Zod
-   @hookform/resolvers

### Data Fetching
-   TanStack Query (React Query)

### Database and ORM
-   Drizzle ORM
-   @neondatabase/serverless
-   drizzle-kit
-   drizzle-zod

### Authentication
-   bcrypt
-   connect-pg-simple

### Utilities
-   date-fns
-   nanoid
-   cmdk

### Development Tools
-   Vite
-   TypeScript
-   tsx
-   ESBuild
-   PostCSS

### Fonts
-   Google Fonts (Architects Daughter, DM Sans, Fira Code, Geist Mono)
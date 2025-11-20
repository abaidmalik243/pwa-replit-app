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
A relational database with UUID primary keys supports entities like Branches, Users (with role-based access), Categories, Menu Items, Orders, Expenses, POS Tables, POS Sessions, Kitchen Tickets, Riders, Deliveries, and Rider Location History for GPS tracking.

### Authentication System
Features Bcrypt hashing, cookie-based session management, and role-based access control (admin, staff, customer, rider) with protected routes. Riders are automatically assigned user accounts during creation, enabling them to login and access their dedicated dashboard.

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

### Promotional Codes System
A comprehensive promo code management system featuring:
-   **Admin Management Interface**: Create, edit, and delete promotional codes with detailed configuration options. Admin page at `/admin/promo-codes` provides centralized promo code management.
-   **Flexible Discount Types**: Support for both percentage-based and fixed-amount discounts with optional maximum discount caps for percentage types.
-   **Usage Controls**: Configurable total usage limits and per-user limits to prevent abuse. Real-time usage tracking shows used count vs. limit.
-   **Time-Based Validity**: Set start dates (validFrom) and expiration dates (validUntil) for time-sensitive promotions.
-   **Minimum Order Requirements**: Configure minimum order amounts to incentivize larger orders.
-   **Branch-Specific Codes**: Option to restrict promo codes to specific branches or make them available chain-wide.
-   **Status Management**: Toggle codes active/inactive to control availability without deletion.
-   **Validation API**: Backend endpoint `/api/promo-codes/validate` validates codes in real-time, checking expiry, usage limits, minimum order amount, and branch restrictions.
-   **Usage Tracking**: Complete audit trail of promo code usage linked to orders and users for reporting and analytics.
-   **Database Schema**: `promo_codes` table stores code configurations, `promo_code_usage` table tracks each use, orders table includes `promoCodeId` reference for applied codes.

### Delivery Charges System
A flexible delivery charges management system supporting both static and dynamic pricing models with address-based geocoding:
-   **Admin Configuration Interface**: Branch-specific delivery charge settings with real-time preview. Admin page at `/admin/delivery-charges` provides centralized delivery charges management per branch.
-   **Pricing Models**: 
    -   **Static Pricing**: Fixed delivery fee for all orders.
    -   **Dynamic Pricing**: Distance-based calculation with base charge plus per-kilometer rate.
-   **Address-Based Distance Calculation**: 
    -   Integrates OpenStreetMap Nominatim API for free geocoding (no API key required).
    -   Haversine formula calculates distance between branch coordinates and delivery address.
    -   Geocoding cache (24h TTL, 500 entries) reduces external API calls.
    -   Rate limiting (10 requests/min per address) prevents DoS attacks.
    -   Minimum address validation (5 characters) prevents abuse.
    -   Graceful error handling: returns default charge (Rs. 50) on geocoding failures.
-   **Free Delivery Threshold**: Configure minimum order amount for free delivery to incentivize larger orders.
-   **Maximum Delivery Distance**: Set distance limits for dynamic pricing to control service area.
-   **Configuration Status**: Toggle configurations active/inactive. Inactive configs automatically fallback to system defaults.
-   **Calculation API**: Backend endpoint `/api/delivery-charges/calculate` accepts `deliveryAddress` parameter, geocodes it, calculates distance from branch, and applies pricing model.
-   **Fallback Handling**: When branch config is inactive, missing, or geocoding fails, system uses DEFAULT_DELIVERY_CONFIG (static: Rs. 50, dynamic: Rs. 50 base + Rs. 20/km, free above Rs. 1500, max 15 KM).
-   **Response Indicators**: API includes `usingCustomConfig` flag to indicate whether custom config or defaults were applied, plus calculated `distance` when available.
-   **Database Schema**: `delivery_charges_config` table stores per-branch configuration with unique constraint on branchId; `branches` table includes latitude/longitude coordinates; `orders` table stores customerAddress and deliveryDistance.

### Rider Management System
A comprehensive delivery rider management module featuring:
-   **Rider CRUD Management**: Admin interface for creating, editing, and deleting riders with details including name, phone, email, vehicle type, vehicle number, and branch assignment.
-   **User Account Integration**: Automatic user account creation for riders with "rider" role during rider creation. Each rider is linked to a user account via `userId` field, enabling authentication.
-   **GPS Location Tracking**: Real-time location updates for riders with history tracking (latitude, longitude, speed, heading, accuracy) stored in the database.
-   **Delivery Assignment**: Automated assignment of delivery orders to available riders with status tracking (assigned, accepted, picked_up, in_transit, delivered, cancelled).
-   **Rider Status Management**: Track rider availability (online, offline, busy, on_break) with automatic status updates based on delivery assignments.
-   **Performance Tracking**: Monitor rider statistics including total deliveries completed and average rating.
-   **Live Rider Tracking Dashboard**: Admin interface with visual map representation showing all active riders, their real-time locations, current deliveries, and status. Features branch filtering, auto-refresh, and detailed delivery tracking.
-   **Rider Mobile Dashboard**: Mobile-friendly interface for riders to view assigned deliveries, update delivery status, manage availability, and share GPS location. Displays active and completed deliveries with customer information and navigation.
-   **Rider Authentication**: Role-based authentication system with "rider" role. Riders can login using their email and password. Protected routes ensure only authenticated riders can access the rider dashboard.
-   **API Endpoints**: RESTful endpoints for rider management (`/api/riders`), authenticated rider data (`/api/riders/me`), delivery assignment (`/api/deliveries/assign`), delivery status updates (`/api/deliveries/:id/status`), and GPS location updates (`/api/riders/:id/location`).

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
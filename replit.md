# Food Ordering PWA - Kebabish Pizza

## Overview

Kebabish Pizza is a multi-branch Progressive Web Application (PWA) designed for a restaurant chain. It features a customer-facing ordering system with loyalty programs and order tracking, a comprehensive Point of Sale (POS) system for staff, inventory management with stock and supplier tracking, and complete payment processing. The application aims to enhance the customer ordering experience and streamline restaurant operations across multiple branches through responsive design, real-time updates, and role-based access control. Key capabilities include customer accounts, real-time order management, kitchen display system, delivery management with rider tracking, and detailed reporting.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Technology Stack
**Frontend**: React with TypeScript, Vite, shadcn/ui (Radix UI), Tailwind CSS, Wouter, TanStack Query, React Hook Form with Zod.
**Backend**: Express.js with TypeScript.
**Database**: PostgreSQL with Drizzle ORM (Neon Serverless PostgreSQL).

### Core Architectural Decisions
The system uses a relational database with UUID primary keys and supports role-based access control (admin, staff, customer, rider). A RESTful Express.js API handles authentication and resource management. Data persistence is managed via an `IStorage` interface abstracting Drizzle ORM, with Drizzle Kit for schema migrations.

### Frontend Architecture
The application features a dual interface design: a visual-first Customer Interface and a productivity-focused Admin Panel with fixed sidebar navigation and real-time dashboards. State management uses TanStack Query for server state, React `useState` for local UI, React Hook Form for forms, and `localStorage` for authentication. It's built as a PWA with a web app manifest and a service worker for offline capabilities, and all pages are fully responsive using a mobile-first approach with Tailwind CSS.

### Real-Time Features
Complete Socket.IO integration provides instant real-time updates across all terminals for events like order creation, status updates, kitchen tickets, rider location, and POS sessions, eliminating polling. Sound notifications are used for new order alerts.

### Feature Specifications

**POS Module**: Integrates order entry, visual table management, real-time Kitchen Display System (KDS), cash register/session management, multi-method payment processing (Cash, Card, JazzCash), discount management, and a reporting dashboard. It also supports branch switching for multi-location oversight.

**Menu Item Variant Management**: Allows for complex menu item customization (e.g., sizes, toppings) with configurable variant groups, options, and price modifiers, integrated into both POS and customer interfaces.

**Customer Payment System**: Supports Cash on Delivery (COD) and JazzCash, with a workflow for manual staff verification for JazzCash payments.

**Promotional Codes System**: Provides flexible promo code management via an admin interface, supporting percentage/fixed discounts, usage limits, time-based validity, minimum order requirements, and branch-specific application. Includes a real-time validation API and usage tracking.

**Delivery Charges System**: Manages flexible delivery charges with static and dynamic pricing models, including distance-based calculations using OpenStreetMap Nominatim for geocoding. Features free delivery thresholds, maximum delivery distances, and estimated delivery times. Configuration is per-branch with fallback handling to system defaults.

**Customer Accounts System**: Offers saved addresses, favorites/wishlist, a loyalty points program (earn/redeem), and a comprehensive order history with one-click reorder functionality. All customer data is secured with ownership verification.

**Inventory Management System**: Features real-time stock tracking with automatic deduction on order completion, low stock alerts, supplier management, inventory transaction history, and wastage tracking.

**Payment Processing System**: Complete payment integration supporting multiple payment methods with automated processing. Stripe integration uses the Replit connector with `stripe-replit-sync` for automatic data synchronization. Features include:
- **Stripe Card Payments**: Full checkout session creation, payment intent management, automated webhook handling for payment confirmation
- **JazzCash Mobile Wallet**: Manual verification workflow where staff review transaction IDs and payment screenshots
- **Automated Refunds**: Stripe refunds processed automatically via API; JazzCash refunds marked for manual processing
- **Payment Tracking**: Orders store Stripe payment intent IDs, checkout session IDs, customer IDs, and refund IDs
- **Webhook Security**: UUID-based webhook endpoint for secure Stripe event processing
- **Data Sync**: Automatic bidirectional sync between Stripe and PostgreSQL for products, prices, customers, and payment records

**Rider Management System**: Includes CRUD management for riders, automatic user account creation for riders, real-time GPS location tracking with history, automated delivery assignment, rider status management, performance tracking, and live admin dashboard with map visualization. Riders have a dedicated mobile dashboard and role-based authentication.

**JazzCash Admin Monitoring**: Comprehensive admin dashboard at `/admin/jazzcash` for managing and monitoring JazzCash transactions. Features include:
- **Configuration Management**: View and manage JazzCash credentials (Merchant ID, Password, Integrity Salt) with secure environment variable integration
- **Transaction History**: Paginated transaction table with filtering capabilities, transaction ID tracking, and payment status monitoring
- **Statistics Dashboard**: Real-time metrics showing total transactions, success rate, pending verifications, and total revenue from JazzCash payments
- **Integration Health**: Quick configuration validation and sandbox/production environment status display

**Advanced Analytics Dashboard**: Business intelligence dashboard at `/admin/analytics` providing comprehensive insights across multiple timeframes (7/30/90 days). Features include:
- **Sales Trends Analysis**: Revenue charts showing daily sales patterns, average order values, and growth trends over time
- **Customer Behavior Analytics**: Metrics on new vs. returning customers, order frequency patterns, and customer lifetime value calculations
- **Product Performance**: Top-selling items ranked by revenue and quantity, category performance breakdowns, and product popularity trends
- **Peak Hours Analysis**: Hourly demand heatmaps showing order volume distribution throughout the day for optimized staffing and inventory
- **Overview Metrics**: Real-time KPI cards displaying total revenue, order counts, average order value, and customer acquisition statistics
- **Time Range Filtering**: Dynamic data filtering with proper query parameter handling via structured searchParams for accurate time-based analysis

## External Dependencies

### UI Component Libraries
-   Radix UI
-   shadcn/ui

### Styling and Design
-   Tailwind CSS

### Form Management
-   React Hook Form
-   Zod

### Data Fetching
-   TanStack Query

### Database and ORM
-   Drizzle ORM
-   @neondatabase/serverless

### Authentication
-   bcrypt
-   connect-pg-simple

### Utilities
-   date-fns
-   nanoid
-   cmdk

### Fonts
-   Google Fonts (Architects Daughter, DM Sans, Fira Code, Geist Mono)
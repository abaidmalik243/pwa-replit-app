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

**Staff Shift & Schedule Management**: Comprehensive workforce management system with automated scheduling, attendance tracking, and performance analytics. Features include:
- **Shift Scheduling**: Calendar-based interface at `/admin/shifts` for creating and managing staff shifts with automatic conflict detection
- **Staff Attendance**: Clock in/out functionality at `/staff/attendance` with GPS location tracking and photo verification support
- **Availability Management**: Staff can set weekly availability preferences to prevent scheduling conflicts
- **Overtime Tracking**: Automatic calculation of overtime hours (40hrs/week threshold) with separate overtime records
- **Shift Reports**: Performance analytics at `/admin/shift-reports` showing revenue per shift, attendance rates, and staff productivity metrics
- **Real-time Updates**: WebSocket events (shiftAssigned, shiftUpdated, shiftDeleted, attendanceClockIn, attendanceClockOut) for instant notifications
- **Role-based Authorization**: Comprehensive security with user scoping - staff can only manage their own shifts, admins have full access
- **Conflict Detection**: Prevents double-booking with automated validation before shift assignment
- **POS Integration**: Links shifts to POS sessions for accurate performance tracking and accountability

**WhatsApp Marketing & Promotional Campaigns**: Comprehensive marketing automation system for customer engagement via WhatsApp messaging. Features include:
- **Campaign Management**: Complete CRUD at `/admin/marketing-campaigns` with status tracking (draft, scheduled, sending, completed, failed)
- **Message Templates**: Reusable templates at `/admin/message-templates` with personalization variables ({{name}}, {{phone}}, custom fields) organized by category (promotional, transactional, reminder, announcement, seasonal)
- **Customer Segmentation**: Audience targeting at `/admin/customer-segments` with predefined segments (All, Loyal Gold Tier, New Customers ≤3 orders, Inactive) and custom filter support
- **Campaign Builder**: Interactive campaign creation with template selection, audience preview, message personalization, and scheduling capabilities
- **Launch Workflow**: Automated recipient list generation from segments, personalized message creation with variable replacement, bulk recipient tracking with individual status
- **Analytics Tracking**: Campaign metrics showing total recipients, sent count, delivered count, failed count, and delivery rates
- **Database Schema**: 5 tables - marketing_campaigns, campaign_recipients, message_templates, customer_segments, campaign_analytics
- **Admin-Only Access**: All marketing features require admin role authorization for security
- **WhatsApp API Integration**: System is ready for WhatsApp Business API integration - requires external service credentials (NOT Twilio for promotional messages per user requirement)
- **Integration Note**: Campaign launch endpoint creates personalized recipients and updates campaign status. Actual WhatsApp message sending requires external API integration - credentials should be stored as secrets when ready.

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

## Feature Implementation Status

**Total Implemented**: 52+ features (85% complete)

### ✅ Fully Implemented Modules
- Customer ordering system with variants and customization
- Multi-payment processing (Stripe, JazzCash, COD)
- Point of Sale (POS) system with table management
- Kitchen Display System (KDS) with real-time updates
- Delivery & Rider Management with GPS tracking
- Inventory management with stock tracking
- Menu and category management
- Customer accounts with loyalty program
- Advanced analytics dashboard (sales, customers, products, peak hours)
- JazzCash payment monitoring and admin dashboard
- Staff Shift & Schedule Management - Scheduling, attendance tracking, overtime calculation, shift-based reporting
- **WhatsApp Marketing Campaigns** (NEW) - Campaign management, message templates, customer segmentation, audience targeting
- Real-time WebSocket communication
- Role-based access control (Admin, Staff, Customer, Rider)
- Staff shift-based POS sessions
- Refund management (Stripe and JazzCash)

### 🔴 CRITICAL Missing Features (Must implement before launch)
1. **SMS & Email Notifications** - Order confirmations, delivery updates, payment status (Twilio/SendGrid)
2. **Table Reservations** - For dine-in operations
3. **Customer Feedback System** - Ratings and reviews after delivery
4. **Additional Payment Gateways** - Easypaisa, Sadapay, local credit card processing

### 🟡 Important Missing Features (Add in Phase 2)
1. Financial management (VAT/Tax, COGS, expense tracking)
2. Franchise/multi-location consolidated reporting
3. Quality control and item ratings
4. Kitchen production control (recipes, preparation times)

### 🟠 Enhancement Features (Phase 3+)
1. QR code ordering and payment
2. Third-party integrations (Foodpanda, Careem, QuickBooks)
3. Subscription and premium membership tiers
4. Advanced customer service (chatbot, live chat)
5. Multi-language support (Urdu, Arabic)

For complete feature documentation, see `FEATURES_DOCUMENTATION.md`
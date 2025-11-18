# Food Ordering PWA - Kebabish Pizza

## Overview

Kebabish Pizza is a multi-branch food ordering Progressive Web Application (PWA) designed for a restaurant chain in Pakistan. It features a customer-facing ordering system and an administrative management panel. The application enables customers to browse menus, place orders, and track deliveries, while providing restaurant staff with real-time order management, menu control, user administration, and expense tracking. Built as a full-stack TypeScript solution, it focuses on responsive design, real-time updates, and role-based access control, aiming to enhance the food ordering experience and streamline restaurant operations.

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
- **Orders**: Order management with customer info, item details, status tracking, and timestamps.
- **Expenses**: Financial tracking by branch with categories and date-based reporting.

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
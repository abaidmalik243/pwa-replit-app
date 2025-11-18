# Food Ordering PWA - Kebabish Pizza

## Overview

Kebabish Pizza is a multi-branch food ordering Progressive Web Application (PWA) designed for a restaurant chain operating in three Pakistani cities: Okara, Sahiwal, and Faisalabad. The application features a dual-interface architecture with a customer-facing ordering system and an administrative management panel.

The system enables customers to browse menus, place orders, and track deliveries while providing restaurant staff with real-time order management, menu control, user administration, and expense tracking capabilities. The application is built as a full-stack TypeScript solution with a focus on responsive design, real-time updates, and role-based access control.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Technology Stack

**Frontend Framework**: React with TypeScript, using Vite as the build tool and development server. The UI is built with shadcn/ui components (Radix UI primitives) styled with Tailwind CSS.

**Backend Framework**: Express.js server with TypeScript, serving both API endpoints and the compiled React application in production.

**Routing**: Client-side routing handled by Wouter (lightweight React router).

**State Management**: TanStack Query (React Query) for server state management, caching, and data synchronization.

**Form Handling**: React Hook Form with Zod schema validation for type-safe form handling.

**Styling System**: Tailwind CSS with custom design tokens defined in the theme configuration. The design follows a "New York" style variant from shadcn/ui with custom color schemes supporting light/dark modes.

### Database Architecture

**ORM**: Drizzle ORM configured for PostgreSQL with type-safe schema definitions.

**Database Provider**: Neon Serverless PostgreSQL (based on `@neondatabase/serverless` dependency).

**Schema Design**: The application uses a relational database with the following core entities:

- **Branches**: Multi-location support with delivery area definitions, custom branding (logo, colors), and active status flags.
- **Users**: Authentication and role-based access control (admin, staff, customer) with feature-based permissions array and branch assignment.
- **Categories**: Menu organization with images, descriptions, and active status.
- **Menu Items**: Product catalog with pricing, descriptions, images, category relationships, vegetarian flags, and availability status.
- **Orders**: Order management with customer information, item details, status tracking (pending, preparing, ready, delivered, cancelled), and timestamps.
- **Expenses**: Financial tracking by branch with categories (rent, utilities, supplies, salaries, marketing, maintenance, transportation, other) and date-based reporting.

All tables use UUID primary keys generated via PostgreSQL's `gen_random_uuid()` function.

### Authentication System

**Password Security**: Bcrypt hashing (10 rounds) for password storage.

**Session Management**: Cookie-based sessions with credentials included in API requests.

**Role-Based Access Control**: Three user roles (admin, staff, customer) with protected routes enforcing role requirements. Admin users have full access, staff can manage orders and menu, customers have ordering access only.

**Protected Routes**: Client-side route protection using a `ProtectedRoute` component that checks localStorage for user authentication and role authorization before rendering admin pages.

### API Architecture

**RESTful Endpoints**: Express routes organized under `/api` prefix with JSON request/response handling.

**Authentication Routes**:
- `POST /api/auth/signup`: User registration with duplicate email/username validation
- `POST /api/auth/login`: User authentication with bcrypt password verification

**Resource Endpoints** (pattern observed in frontend queries):
- `/api/categories`: Category CRUD operations
- `/api/branches`: Branch management
- `/api/menu-items`: Menu item management
- `/api/orders`: Order processing and status updates
- `/api/expenses`: Expense tracking and reporting
- `/api/users`: User management (admin only)

**Request Logging**: Custom Express middleware logs API requests with method, path, status code, duration, and truncated response body (80 character limit).

### Storage Layer

**Abstraction Pattern**: A storage interface (`IStorage` in `server/storage.ts`) defines all CRUD operations, providing a clean separation between business logic and database access.

**Database Client**: Drizzle ORM client instantiated with Neon serverless connection pool, providing type-safe query building.

**Migration Strategy**: Drizzle Kit configured for schema migrations with migrations stored in `/migrations` directory.

### Frontend Architecture

**Component Structure**: 
- Reusable UI components in `/client/src/components/ui` (shadcn/ui library)
- Feature-specific components in `/client/src/components`
- Page components in `/client/src/pages`
- Custom hooks in `/client/src/hooks`

**Dual Interface Design**:

1. **Customer Interface**: Visual-first, appetite-driven design inspired by Uber Eats and DoorDash
   - Hero slider with food imagery
   - Horizontal scrollable category filter
   - Grid-based menu item cards with "Add to Cart" functionality
   - Slide-over cart drawer with quantity controls and checkout
   - Responsive layout (3-column desktop, 2-column tablet, single column mobile)

2. **Admin Panel**: Clean, productivity-focused design inspired by Linear and Notion
   - Fixed sidebar navigation with route highlighting
   - Breadcrumb navigation in header
   - Dashboard with real-time order cards and analytics (revenue trends, popular items)
   - CRUD interfaces for menu items, categories, users, and expenses
   - Inventory demand tracking with stock level monitoring and alerts
   - Sound notification system for new orders

**State Management Patterns**:
- Server state managed by TanStack Query with query keys following RESTful patterns
- Local UI state (cart, dialogs, filters) managed with React useState
- Form state handled by React Hook Form with Zod validation
- User authentication state persisted to localStorage

**Asset Management**: Static assets organized in `/attached_assets/generated_images` with TypeScript imports for type safety.

### PWA Features

**Manifest**: Web app manifest configured in `/client/public/manifest.json` with standalone display mode, theme colors, and icon definitions.

**Responsive Design**: Mobile-first approach with Tailwind breakpoints (md: 768px, lg: 1024px).

**Accessibility**: Semantic HTML, ARIA labels, keyboard navigation support, and screen reader compatibility through Radix UI primitives.

### Real-Time Features

**Order Notifications**: Web Audio API-based notification sound system for new orders in admin dashboard.

**Audio Context**: Custom notification sound generator using oscillators with multi-tone pattern (high-low-high sequence) for attention-grabbing alerts.

**Sound Control**: Toggle functionality in admin sidebar to enable/disable notification sounds.

### Development Workflow

**Development Server**: Vite dev server with HMR (Hot Module Replacement) running in middleware mode behind Express proxy.

**Type Safety**: Shared TypeScript types between client and server via `/shared` directory.

**Path Aliases**: Configured TypeScript path mappings for clean imports (`@/`, `@shared/`, `@assets/`).

**Error Handling**: Runtime error overlay in development via Replit-specific Vite plugins.

### Build and Deployment

**Client Build**: Vite builds React application to `/dist/public` with optimized production bundles.

**Server Build**: ESBuild bundles TypeScript server code to `/dist` with ESM format and external package resolution.

**Static File Serving**: Express serves compiled React application in production with Vite middleware in development.

**Environment Configuration**: Database connection via `DATABASE_URL` environment variable with validation on startup.

### Seeding Strategy

**Initial Data**: Seed script creates three branches (Okara, Sahiwal, Faisalabad) with delivery areas and default admin account (username: `abaidmalik`, email: `abaidmalik243@gmail.com`, password: `Abcd@1234`).

**Data Population**: Ready for menu items, categories, and sample orders to be added via admin interface or extended seed script.

## External Dependencies

### UI Component Libraries
- **Radix UI**: Unstyled, accessible component primitives (accordion, alert-dialog, avatar, checkbox, dialog, dropdown-menu, label, popover, progress, radio-group, scroll-area, select, separator, slider, switch, tabs, toast, tooltip)
- **shadcn/ui**: Pre-styled component collection built on Radix UI with Tailwind CSS

### Styling and Design
- **Tailwind CSS**: Utility-first CSS framework with custom theme configuration
- **class-variance-authority**: Type-safe variant styling for components
- **clsx & tailwind-merge**: Utility for conditional class name merging

### Form Management
- **React Hook Form**: Performant form library with validation
- **Zod**: TypeScript-first schema validation
- **@hookform/resolvers**: Validation resolver for React Hook Form

### Data Fetching
- **TanStack Query (React Query)**: Server state management with caching, background updates, and query invalidation

### Database and ORM
- **Drizzle ORM**: TypeScript ORM with type-safe query builder
- **@neondatabase/serverless**: Neon PostgreSQL serverless driver
- **drizzle-kit**: Schema management and migration tool
- **drizzle-zod**: Automatic Zod schema generation from Drizzle schemas

### Authentication
- **bcrypt**: Password hashing library
- **connect-pg-simple**: PostgreSQL session store for Express sessions

### Utilities
- **date-fns**: Date manipulation and formatting
- **nanoid**: Unique ID generation
- **cmdk**: Command menu component (used in admin interface)

### Development Tools
- **Vite**: Build tool and development server
- **TypeScript**: Type-safe JavaScript
- **tsx**: TypeScript execution for Node.js
- **ESBuild**: JavaScript bundler for production server build
- **PostCSS**: CSS processing with Autoprefixer
- **@replit/vite-plugin-***: Replit-specific development plugins (runtime error modal, cartographer, dev banner)

### Fonts
- **Google Fonts**: Multiple font families imported (Architects Daughter, DM Sans, Fira Code, Geist Mono) for typography hierarchy
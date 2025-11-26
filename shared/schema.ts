import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Branches
export const branches = pgTable("branches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  city: text("city").notNull(),
  address: text("address"),
  phone: text("phone"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }), // GPS latitude
  longitude: decimal("longitude", { precision: 10, scale: 7 }), // GPS longitude
  deliveryAreas: text("delivery_areas").array(), // Areas where delivery is available
  logoUrl: text("logo_url"), // Custom branch logo
  primaryColor: text("primary_color"), // Custom branch color
  isActive: boolean("is_active").notNull().default(true),
});

export const insertBranchSchema = createInsertSchema(branches).omit({ id: true });
export type InsertBranch = z.infer<typeof insertBranchSchema>;
export type Branch = typeof branches.$inferSelect;

// Users with authentication and roles
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  role: text("role").notNull().default("customer"), // admin, staff, customer, rider
  permissions: text("permissions").array(), // Feature-based permissions (e.g., "manage_menu", "view_reports")
  branchId: varchar("branch_id").references(() => branches.id),
  language: text("language").default("en"), // User's preferred language (en, ur, ar)
  currency: text("currency").default("PKR"), // User's preferred currency (PKR, USD, AED, SAR)
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Password Reset Tokens
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  tokenHash: text("token_hash").notNull().unique(), // Store hashed token for security
  expiresAt: timestamp("expires_at").notNull(), // Token expiration time
  usedAt: timestamp("used_at"), // Track if token has been used
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({ id: true, createdAt: true });
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// Categories
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCategorySchema = createInsertSchema(categories).omit({ id: true, createdAt: true });
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

// Menu Items
export const menuItems = pgTable("menu_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  size: text("size"), // Small, Medium, Large, F-1, F-2, etc.
  variant: text("variant"), // Regular, Special Treat, Square, Stuffer, etc.
  categoryId: varchar("category_id").references(() => categories.id),
  imageUrl: text("image_url"),
  isAvailable: boolean("is_available").notNull().default(true),
  isHotSelling: boolean("is_hot_selling").notNull().default(false), // Display in hot-selling section
  stockQuantity: integer("stock_quantity").default(0), // For inventory management
  lowStockThreshold: integer("low_stock_threshold").default(10), // Alert threshold
  branchId: varchar("branch_id").references(() => branches.id), // null means available at all branches
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMenuItemSchema = createInsertSchema(menuItems).omit({ id: true, createdAt: true });
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type MenuItem = typeof menuItems.$inferSelect;

// Variant Groups (e.g., "Size", "Crust Type", "Toppings")
export const variantGroups = pgTable("variant_groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // e.g., "Size", "Crust", "Toppings"
  description: text("description"),
  displayOrder: integer("display_order").default(0), // Order to display in UI
  selectionType: text("selection_type").notNull().default("single"), // single or multiple
  isRequired: boolean("is_required").notNull().default(true), // Must select at least one option
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertVariantGroupSchema = createInsertSchema(variantGroups).omit({ id: true, createdAt: true });
export type InsertVariantGroup = z.infer<typeof insertVariantGroupSchema>;
export type VariantGroup = typeof variantGroups.$inferSelect;

// Variant Options (e.g., "Small", "Medium", "Large" for Size group)
export const variantOptions = pgTable("variant_options", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  variantGroupId: varchar("variant_group_id").references(() => variantGroups.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(), // e.g., "Small", "Medium", "Large"
  shortName: text("short_name"), // e.g., "S", "M", "L" for compact display
  priceModifier: decimal("price_modifier", { precision: 10, scale: 2 }).default("0"), // +/- price adjustment
  displayOrder: integer("display_order").default(0),
  isDefault: boolean("is_default").notNull().default(false), // Pre-select this option
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertVariantOptionSchema = createInsertSchema(variantOptions).omit({ id: true, createdAt: true });
export type InsertVariantOption = z.infer<typeof insertVariantOptionSchema>;
export type VariantOption = typeof variantOptions.$inferSelect;

// Menu Item Variants - Junction table linking menu items to variant groups
export const menuItemVariants = pgTable("menu_item_variants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  menuItemId: varchar("menu_item_id").references(() => menuItems.id, { onDelete: "cascade" }).notNull(),
  variantGroupId: varchar("variant_group_id").references(() => variantGroups.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMenuItemVariantSchema = createInsertSchema(menuItemVariants).omit({ id: true, createdAt: true });
export type InsertMenuItemVariant = z.infer<typeof insertMenuItemVariantSchema>;
export type MenuItemVariant = typeof menuItemVariants.$inferSelect;

// Promo Codes
export const promoCodes = pgTable("promo_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(), // Promo code (e.g., SAVE20, FIRSTORDER)
  description: text("description"), // Description of the promo
  discountType: text("discount_type").notNull().default("percentage"), // percentage or fixed
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(), // Percentage (e.g., 20) or fixed amount (e.g., 100)
  minOrderAmount: decimal("min_order_amount", { precision: 10, scale: 2 }).default("0"), // Minimum order amount required
  maxDiscountAmount: decimal("max_discount_amount", { precision: 10, scale: 2 }), // Max discount cap for percentage types
  usageLimit: integer("usage_limit"), // Total usage limit (null = unlimited)
  usageCount: integer("usage_count").notNull().default(0), // Current usage count
  perUserLimit: integer("per_user_limit"), // Usage limit per user (null = unlimited)
  validFrom: timestamp("valid_from").notNull().defaultNow(), // Start date
  validUntil: timestamp("valid_until"), // Expiry date (null = no expiry)
  isActive: boolean("is_active").notNull().default(true),
  branchId: varchar("branch_id").references(() => branches.id), // null = valid for all branches
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPromoCodeSchema = createInsertSchema(promoCodes).omit({ id: true, createdAt: true, usageCount: true });
export type InsertPromoCode = z.infer<typeof insertPromoCodeSchema>;
export type PromoCode = typeof promoCodes.$inferSelect;

// Promo Code Usage Tracking
export const promoCodeUsage = pgTable("promo_code_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  promoCodeId: varchar("promo_code_id").references(() => promoCodes.id, { onDelete: "cascade" }).notNull(),
  orderId: varchar("order_id").references(() => orders.id).notNull(),
  userId: varchar("user_id").references(() => users.id),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).notNull(),
  usedAt: timestamp("used_at").notNull().defaultNow(),
});

export const insertPromoCodeUsageSchema = createInsertSchema(promoCodeUsage).omit({ id: true, usedAt: true });
export type InsertPromoCodeUsage = z.infer<typeof insertPromoCodeUsageSchema>;
export type PromoCodeUsage = typeof promoCodeUsage.$inferSelect;

// Orders
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderNumber: text("order_number").notNull().unique(),
  customerId: varchar("customer_id").references(() => users.id),
  branchId: varchar("branch_id").references(() => branches.id).notNull(),
  sessionId: varchar("session_id").references(() => posSessions.id), // POS: Link to cash register session
  tableId: varchar("table_id").references(() => posTables.id), // POS: For dine-in orders
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  alternativePhone: text("alternative_phone"), // Alternative contact number
  customerAddress: text("customer_address"), // For delivery orders
  deliveryArea: text("delivery_area"), // Selected delivery area
  orderType: text("order_type").notNull().default("takeaway"), // takeaway, delivery, or dine-in
  orderSource: text("order_source").notNull().default("online"), // online, pos, phone
  paymentMethod: text("payment_method").notNull().default("cash"), // cash, card, jazzcash, stripe
  paymentStatus: text("payment_status").notNull().default("pending"), // pending, awaiting_verification, paid, failed, partial
  jazzCashTransactionId: text("jazzcash_transaction_id"), // JazzCash transaction ID provided by customer
  jazzCashPayerPhone: text("jazzcash_payer_phone"), // Phone number used for JazzCash payment
  jazzCashScreenshotUrl: text("jazzcash_screenshot_url"), // Optional payment screenshot URL
  stripeCheckoutSessionId: text("stripe_checkout_session_id"), // Stripe checkout session ID
  stripePaymentIntentId: text("stripe_payment_intent_id"), // Stripe payment intent ID for refunds
  items: text("items").notNull(), // JSON string
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(), // Order subtotal before delivery/discount
  promoCodeId: varchar("promo_code_id").references(() => promoCodes.id), // Applied promo code
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"), // POS/Promo: Discount amount
  discountReason: text("discount_reason"), // POS: Reason for discount (or promo code)
  deliveryCharges: decimal("delivery_charges", { precision: 10, scale: 2 }).default("0"), // Delivery charges
  deliveryDistance: decimal("delivery_distance", { precision: 5, scale: 2 }), // Distance in KM
  total: decimal("total", { precision: 10, scale: 2 }).notNull(), // subtotal - discount + deliveryCharges
  status: text("status").notNull().default("pending"), // pending, preparing, ready, completed, cancelled
  waiterId: varchar("waiter_id").references(() => users.id), // POS: Assigned waiter for dine-in
  servedBy: varchar("served_by").references(() => users.id), // POS: Cashier/staff who took the order
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  subtotal: z.string().or(z.number()).transform(val => typeof val === 'string' ? val : val.toString()),
  discount: z.string().or(z.number()).transform(val => typeof val === 'string' ? val : val.toString()).optional(),
  deliveryCharges: z.string().or(z.number()).transform(val => typeof val === 'string' ? val : val.toString()).optional(),
  deliveryDistance: z.string().or(z.number()).transform(val => typeof val === 'string' ? val : val.toString()).optional(),
  total: z.string().or(z.number()).transform(val => typeof val === 'string' ? val : val.toString()),
});
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

// Delivery Charges Configuration (per branch)
export const deliveryChargesConfig = pgTable("delivery_charges_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  branchId: varchar("branch_id").references(() => branches.id).notNull().unique(),
  chargeType: text("charge_type").notNull().default("static"), // static or dynamic
  staticCharge: decimal("static_charge", { precision: 10, scale: 2 }).default("50"), // Fixed charge for static pricing
  baseCharge: decimal("base_charge", { precision: 10, scale: 2 }).default("50"), // Base charge for dynamic pricing
  perKmCharge: decimal("per_km_charge", { precision: 10, scale: 2 }).default("20"), // Per KM charge for dynamic pricing
  freeDeliveryThreshold: decimal("free_delivery_threshold", { precision: 10, scale: 2 }).default("1500"), // Free delivery above this amount
  maxDeliveryDistance: decimal("max_delivery_distance", { precision: 5, scale: 2 }).default("15"), // Maximum delivery distance in KM
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDeliveryChargesConfigSchema = createInsertSchema(deliveryChargesConfig).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDeliveryChargesConfig = z.infer<typeof insertDeliveryChargesConfigSchema>;
export type DeliveryChargesConfig = typeof deliveryChargesConfig.$inferSelect;

// Default delivery charges configuration (fallback if no branch config exists)
export const DEFAULT_DELIVERY_CONFIG = {
  CHARGE_TYPE: "static",
  STATIC_CHARGE: 50, // Fixed delivery charge in PKR
  BASE_CHARGE: 50, // Base charge for dynamic pricing in PKR
  PER_KM_CHARGE: 20, // Per kilometer charge in PKR
  FREE_DELIVERY_THRESHOLD: 1500, // Free delivery above this order amount in PKR
  MAX_DELIVERY_DISTANCE: 15, // Maximum delivery distance in KM
};

// Daily Expenses
export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  branchId: varchar("branch_id").references(() => branches.id).notNull(),
  category: text("category").notNull(), // rent, utilities, supplies, salaries, staff, etc.
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: timestamp("date").notNull(),
  staffId: varchar("staff_id").references(() => users.id), // Optional: links to staff member when category is 'staff'
  supplierId: varchar("supplier_id").references(() => suppliers.id), // Optional: links to supplier when category is 'Supplies'
  addedBy: varchar("added_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, createdAt: true });
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;

// POS Tables for Dine-in Management
export const posTables = pgTable("pos_tables", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  branchId: varchar("branch_id").references(() => branches.id).notNull(),
  tableName: text("table_name").notNull(), // Table 1, Table 2, VIP-1, etc.
  tableNumber: integer("table_number").notNull(),
  capacity: integer("capacity").notNull().default(4), // Number of seats
  section: text("section"), // Main Hall, Outdoor, VIP, etc.
  status: text("status").notNull().default("available"), // available, occupied, reserved, cleaning
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPosTableSchema = createInsertSchema(posTables).omit({ id: true, createdAt: true });
export type InsertPosTable = z.infer<typeof insertPosTableSchema>;
export type PosTable = typeof posTables.$inferSelect;

// POS Cash Register Sessions
export const posSessions = pgTable("pos_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  branchId: varchar("branch_id").references(() => branches.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(), // Cashier who opened the session
  sessionNumber: text("session_number").notNull(), // Unique session identifier
  openingCash: decimal("opening_cash", { precision: 10, scale: 2 }).notNull(),
  closingCash: decimal("closing_cash", { precision: 10, scale: 2 }),
  expectedCash: decimal("expected_cash", { precision: 10, scale: 2 }), // Based on transactions
  cashDifference: decimal("cash_difference", { precision: 10, scale: 2 }), // Expected - Closing
  totalSales: decimal("total_sales", { precision: 10, scale: 2 }).default("0"),
  totalOrders: integer("total_orders").default(0),
  cashSales: decimal("cash_sales", { precision: 10, scale: 2 }).default("0"),
  cardSales: decimal("card_sales", { precision: 10, scale: 2 }).default("0"),
  jazzCashSales: decimal("jazz_cash_sales", { precision: 10, scale: 2 }).default("0"),
  status: text("status").notNull().default("open"), // open, closed
  notes: text("notes"),
  openedAt: timestamp("opened_at").notNull().defaultNow(),
  closedAt: timestamp("closed_at"),
});

export const insertPosSessionSchema = createInsertSchema(posSessions).omit({ id: true, openedAt: true });
export type InsertPosSession = z.infer<typeof insertPosSessionSchema>;
export type PosSession = typeof posSessions.$inferSelect;

// Kitchen Order Tickets (KOT)
export const kitchenTickets = pgTable("kitchen_tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => orders.id).notNull(),
  ticketNumber: text("ticket_number").notNull(),
  items: text("items").notNull(), // JSON string of items for this ticket
  station: text("station"), // Grill, Fryer, Pizza Station, etc.
  priority: text("priority").notNull().default("normal"), // urgent, high, normal, low
  status: text("status").notNull().default("pending"), // pending, preparing, ready, served
  specialInstructions: text("special_instructions"),
  preparedBy: varchar("prepared_by").references(() => users.id), // Chef/cook who prepared
  createdAt: timestamp("created_at").notNull().defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});

export const insertKitchenTicketSchema = createInsertSchema(kitchenTickets).omit({ id: true, createdAt: true });
export type InsertKitchenTicket = z.infer<typeof insertKitchenTicketSchema>;
export type KitchenTicket = typeof kitchenTickets.$inferSelect;

// Payment Transactions (supports split payments)
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => orders.id).notNull(),
  sessionId: varchar("session_id").references(() => posSessions.id),
  paymentMethod: text("payment_method").notNull(), // cash, card, jazzcash
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  reference: text("reference"), // Card authorization number, JazzCash transaction ID, etc.
  receivedBy: varchar("received_by").references(() => users.id), // Staff who received payment
  status: text("status").notNull().default("completed"), // pending, completed, refunded
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

// Order Modifications Log
export const orderModifications = pgTable("order_modifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => orders.id).notNull(),
  modifiedBy: varchar("modified_by").references(() => users.id).notNull(),
  modificationType: text("modification_type").notNull(), // item_added, item_removed, discount_applied, etc.
  description: text("description").notNull(),
  oldValue: text("old_value"), // JSON or text of old value
  newValue: text("new_value"), // JSON or text of new value
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOrderModificationSchema = createInsertSchema(orderModifications).omit({ id: true, createdAt: true });
export type InsertOrderModification = z.infer<typeof insertOrderModificationSchema>;
export type OrderModification = typeof orderModifications.$inferSelect;

// Table Reservations
export const tableReservations = pgTable("table_reservations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tableId: varchar("table_id").references(() => posTables.id).notNull(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  guestCount: integer("guest_count").notNull(),
  reservationDate: timestamp("reservation_date").notNull(),
  duration: integer("duration").default(120), // Duration in minutes
  status: text("status").notNull().default("confirmed"), // confirmed, seated, completed, cancelled
  specialRequests: text("special_requests"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTableReservationSchema = createInsertSchema(tableReservations).omit({ id: true, createdAt: true });
export type InsertTableReservation = z.infer<typeof insertTableReservationSchema>;
export type TableReservation = typeof tableReservations.$inferSelect;

// Riders for Delivery Management
export const riders = pgTable("riders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  email: text("email"),
  vehicleType: text("vehicle_type").notNull(), // bike, motorcycle, car, bicycle
  vehicleNumber: text("vehicle_number").notNull(), // License plate number
  branchId: varchar("branch_id").references(() => branches.id).notNull(),
  userId: varchar("user_id").references(() => users.id), // Link to user account for authentication
  status: text("status").notNull().default("offline"), // online, offline, busy, on_break
  isAvailable: boolean("is_available").notNull().default(true), // Can accept new deliveries
  isActive: boolean("is_active").notNull().default(true), // Account active/inactive
  currentLatitude: decimal("current_latitude", { precision: 10, scale: 7 }), // Current GPS location
  currentLongitude: decimal("current_longitude", { precision: 10, scale: 7 }), // Current GPS location
  lastLocationUpdate: timestamp("last_location_update"), // Last time location was updated
  totalDeliveries: integer("total_deliveries").default(0), // Lifetime delivery count
  rating: decimal("rating", { precision: 3, scale: 2 }).default("5.00"), // Average rating
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRiderSchema = createInsertSchema(riders).omit({ id: true, createdAt: true });
export type InsertRider = z.infer<typeof insertRiderSchema>;
export type Rider = typeof riders.$inferSelect;

// Deliveries - Assignment of orders to riders
export const deliveries = pgTable("deliveries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => orders.id).notNull(),
  riderId: varchar("rider_id").references(() => riders.id).notNull(),
  branchId: varchar("branch_id").references(() => branches.id).notNull(),
  assignedBy: varchar("assigned_by").references(() => users.id), // Staff who assigned the delivery
  status: text("status").notNull().default("assigned"), // assigned, accepted, picked_up, in_transit, delivered, cancelled
  customerLatitude: decimal("customer_latitude", { precision: 10, scale: 7 }), // Delivery destination
  customerLongitude: decimal("customer_longitude", { precision: 10, scale: 7 }), // Delivery destination
  estimatedDistance: decimal("estimated_distance", { precision: 5, scale: 2 }), // Distance in KM
  estimatedTime: integer("estimated_time"), // Estimated delivery time in minutes
  actualDistance: decimal("actual_distance", { precision: 5, scale: 2 }), // Actual distance traveled
  actualTime: integer("actual_time"), // Actual time taken in minutes
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
  acceptedAt: timestamp("accepted_at"),
  pickedUpAt: timestamp("picked_up_at"),
  deliveredAt: timestamp("delivered_at"),
  cancelledAt: timestamp("cancelled_at"),
  cancellationReason: text("cancellation_reason"),
  notes: text("notes"),
});

export const insertDeliverySchema = createInsertSchema(deliveries).omit({ id: true, assignedAt: true });
export type InsertDelivery = z.infer<typeof insertDeliverySchema>;
export type Delivery = typeof deliveries.$inferSelect;

// Rider Location History - GPS tracking trail
export const riderLocationHistory = pgTable("rider_location_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  riderId: varchar("rider_id").references(() => riders.id).notNull(),
  deliveryId: varchar("delivery_id").references(() => deliveries.id), // Optional: link to active delivery
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  speed: decimal("speed", { precision: 5, scale: 2 }), // Speed in km/h
  heading: decimal("heading", { precision: 5, scale: 2 }), // Direction in degrees
  accuracy: decimal("accuracy", { precision: 6, scale: 2 }), // GPS accuracy in meters
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertRiderLocationHistorySchema = createInsertSchema(riderLocationHistory).omit({ id: true, timestamp: true });
export type InsertRiderLocationHistory = z.infer<typeof insertRiderLocationHistorySchema>;
export type RiderLocationHistory = typeof riderLocationHistory.$inferSelect;

// Customer Saved Addresses
export const customerAddresses = pgTable("customer_addresses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  label: text("label").notNull(), // Home, Work, Other
  fullAddress: text("full_address").notNull(),
  area: text("area"),
  city: text("city").notNull(),
  landmark: text("landmark"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  phoneNumber: text("phone_number"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCustomerAddressSchema = createInsertSchema(customerAddresses).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCustomerAddress = z.infer<typeof insertCustomerAddressSchema>;
export type CustomerAddress = typeof customerAddresses.$inferSelect;

// Customer Favorite Items
export const customerFavorites = pgTable("customer_favorites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  menuItemId: varchar("menu_item_id").references(() => menuItems.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCustomerFavoriteSchema = createInsertSchema(customerFavorites).omit({ id: true, createdAt: true });
export type InsertCustomerFavorite = z.infer<typeof insertCustomerFavoriteSchema>;
export type CustomerFavorite = typeof customerFavorites.$inferSelect;

// Loyalty Points System
export const loyaltyPoints = pgTable("loyalty_points", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  totalPoints: integer("total_points").notNull().default(0),
  availablePoints: integer("available_points").notNull().default(0),
  lifetimeEarned: integer("lifetime_earned").notNull().default(0),
  lifetimeRedeemed: integer("lifetime_redeemed").notNull().default(0),
  tier: text("tier").notNull().default("bronze"), // bronze, silver, gold, platinum
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertLoyaltyPointsSchema = createInsertSchema(loyaltyPoints).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLoyaltyPoints = z.infer<typeof insertLoyaltyPointsSchema>;
export type LoyaltyPoints = typeof loyaltyPoints.$inferSelect;

// Loyalty Transactions
export const loyaltyTransactions = pgTable("loyalty_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  orderId: varchar("order_id").references(() => orders.id),
  transactionType: text("transaction_type").notNull(), // earn, redeem, expire, bonus, adjustment
  points: integer("points").notNull(), // Positive for earn, negative for redeem/expire
  balanceAfter: integer("balance_after").notNull(),
  description: text("description").notNull(),
  expiresAt: timestamp("expires_at"), // For earned points that expire
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertLoyaltyTransactionSchema = createInsertSchema(loyaltyTransactions).omit({ id: true, createdAt: true });
export type InsertLoyaltyTransaction = z.infer<typeof insertLoyaltyTransactionSchema>;
export type LoyaltyTransaction = typeof loyaltyTransactions.$inferSelect;

// Refunds
export const refunds = pgTable("refunds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => orders.id).notNull(),
  paymentId: varchar("payment_id").references(() => payments.id),
  refundAmount: decimal("refund_amount", { precision: 10, scale: 2 }).notNull(),
  refundMethod: text("refund_method").notNull(), // cash, card, jazzcash, loyalty_points
  reason: text("reason").notNull(),
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  processedBy: varchar("processed_by").references(() => users.id),
  stripeRefundId: text("stripe_refund_id"), // Stripe refund ID if applicable
  notes: text("notes"),
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"),
});

export const insertRefundSchema = createInsertSchema(refunds).omit({ id: true, requestedAt: true });
export type InsertRefund = z.infer<typeof insertRefundSchema>;
export type Refund = typeof refunds.$inferSelect;

// Suppliers for Inventory Management
export const suppliers = pgTable("suppliers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  contactPerson: text("contact_person"),
  phone: text("phone").notNull(),
  email: text("email"),
  address: text("address"),
  city: text("city"),
  category: text("category"), // food, beverage, packaging, supplies
  paymentTerms: text("payment_terms"), // net_30, net_60, cash_on_delivery
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true, createdAt: true });
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliers.$inferSelect;

// Inventory Transactions (Stock movements)
export const inventoryTransactions = pgTable("inventory_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  menuItemId: varchar("menu_item_id").references(() => menuItems.id).notNull(),
  branchId: varchar("branch_id").references(() => branches.id).notNull(),
  transactionType: text("transaction_type").notNull(), // purchase, sale, adjustment, wastage, return
  quantity: integer("quantity").notNull(), // Positive for in, negative for out
  balanceAfter: integer("balance_after").notNull(),
  unitCost: decimal("unit_cost", { precision: 10, scale: 2 }),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }),
  supplierId: varchar("supplier_id").references(() => suppliers.id),
  orderId: varchar("order_id").references(() => orders.id), // Link to sale order if applicable
  reference: text("reference"), // Invoice number, PO number, etc.
  reason: text("reason"),
  performedBy: varchar("performed_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertInventoryTransactionSchema = createInsertSchema(inventoryTransactions).omit({ id: true, createdAt: true });
export type InsertInventoryTransaction = z.infer<typeof insertInventoryTransactionSchema>;
export type InventoryTransaction = typeof inventoryTransactions.$inferSelect;

// Stock Wastage Tracking
export const stockWastage = pgTable("stock_wastage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  menuItemId: varchar("menu_item_id").references(() => menuItems.id).notNull(),
  branchId: varchar("branch_id").references(() => branches.id).notNull(),
  quantity: integer("quantity").notNull(),
  wastageType: text("wastage_type").notNull(), // expired, damaged, overproduction, spillage
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 2 }),
  reason: text("reason").notNull(),
  reportedBy: varchar("reported_by").references(() => users.id),
  wasteDate: timestamp("waste_date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertStockWastageSchema = createInsertSchema(stockWastage).omit({ id: true, createdAt: true });
export type InsertStockWastage = z.infer<typeof insertStockWastageSchema>;
export type StockWastage = typeof stockWastage.$inferSelect;

// Reorder Points Configuration
export const reorderPoints = pgTable("reorder_points", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  menuItemId: varchar("menu_item_id").references(() => menuItems.id, { onDelete: "cascade" }).notNull(),
  branchId: varchar("branch_id").references(() => branches.id).notNull(),
  reorderLevel: integer("reorder_level").notNull(), // Trigger reorder when stock reaches this level
  reorderQuantity: integer("reorder_quantity").notNull(), // How much to order
  preferredSupplierId: varchar("preferred_supplier_id").references(() => suppliers.id),
  leadTimeDays: integer("lead_time_days").default(7), // Expected delivery time
  isActive: boolean("is_active").notNull().default(true),
  lastOrderDate: timestamp("last_order_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertReorderPointSchema = createInsertSchema(reorderPoints).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertReorderPoint = z.infer<typeof insertReorderPointSchema>;
export type ReorderPoint = typeof reorderPoints.$inferSelect;

// Staff Shifts - Define shift templates and schedules
export const staffShifts = pgTable("staff_shifts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  branchId: varchar("branch_id").references(() => branches.id).notNull(),
  shiftName: text("shift_name").notNull(), // Morning, Evening, Night, etc.
  shiftType: text("shift_type").notNull().default("regular"), // regular, split, on_call, flexible
  startTime: text("start_time").notNull(), // HH:MM format (e.g., "09:00")
  endTime: text("end_time").notNull(), // HH:MM format (e.g., "17:00")
  durationMinutes: integer("duration_minutes").notNull(), // Total shift duration in minutes
  breakDurationMinutes: integer("break_duration_minutes").default(30), // Paid/unpaid break duration
  standardHours: decimal("standard_hours", { precision: 5, scale: 2 }).notNull(), // Standard hours before overtime
  overtimeMultiplier: decimal("overtime_multiplier", { precision: 3, scale: 2 }).default("1.5"), // Overtime pay multiplier
  daysOfWeek: text("days_of_week").array(), // ["monday", "tuesday", ...] or null for all days
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertStaffShiftSchema = createInsertSchema(staffShifts).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertStaffShift = z.infer<typeof insertStaffShiftSchema>;
export type StaffShift = typeof staffShifts.$inferSelect;

// Shift Assignments - Assign specific shifts to staff members
export const shiftAssignments = pgTable("shift_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shiftId: varchar("shift_id").references(() => staffShifts.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(), // Staff member assigned
  assignmentDate: timestamp("assignment_date").notNull(), // Specific date for this assignment
  startDateTime: timestamp("start_date_time").notNull(), // Actual start date/time
  endDateTime: timestamp("end_date_time").notNull(), // Actual end date/time
  status: text("status").notNull().default("scheduled"), // scheduled, in_progress, completed, cancelled, no_show
  posSessionId: varchar("pos_session_id").references(() => posSessions.id), // Link to POS session if opened
  notes: text("notes"),
  assignedBy: varchar("assigned_by").references(() => users.id), // Who created the assignment
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertShiftAssignmentSchema = createInsertSchema(shiftAssignments).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertShiftAssignment = z.infer<typeof insertShiftAssignmentSchema>;
export type ShiftAssignment = typeof shiftAssignments.$inferSelect;

// Shift Attendance - Track clock in/out times
export const shiftAttendance = pgTable("shift_attendance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assignmentId: varchar("assignment_id").references(() => shiftAssignments.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  clockInTime: timestamp("clock_in_time").notNull(),
  clockInLatitude: decimal("clock_in_latitude", { precision: 10, scale: 7 }), // GPS location at clock in
  clockInLongitude: decimal("clock_in_longitude", { precision: 10, scale: 7 }),
  clockOutTime: timestamp("clock_out_time"),
  clockOutLatitude: decimal("clock_out_latitude", { precision: 10, scale: 7 }), // GPS location at clock out
  clockOutLongitude: decimal("clock_out_longitude", { precision: 10, scale: 7 }),
  totalMinutesWorked: integer("total_minutes_worked"), // Calculated when clocked out
  regularMinutes: integer("regular_minutes"), // Minutes within standard hours
  overtimeMinutes: integer("overtime_minutes"), // Minutes beyond standard hours
  breakMinutes: integer("break_minutes").default(0), // Total break time taken
  status: text("status").notNull().default("clocked_in"), // clocked_in, clocked_out, on_break
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertShiftAttendanceSchema = createInsertSchema(shiftAttendance).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertShiftAttendance = z.infer<typeof insertShiftAttendanceSchema>;
export type ShiftAttendance = typeof shiftAttendance.$inferSelect;

// Staff Availability - Track when staff are available for scheduling
export const staffAvailability = pgTable("staff_availability", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  dayOfWeek: text("day_of_week").notNull(), // monday, tuesday, wednesday, etc.
  availableFrom: text("available_from").notNull(), // HH:MM format
  availableTo: text("available_to").notNull(), // HH:MM format
  isRecurring: boolean("is_recurring").notNull().default(true), // Applies to all weeks or just once
  effectiveDate: timestamp("effective_date"), // For non-recurring availability
  expiryDate: timestamp("expiry_date"), // Optional expiry for time-limited availability
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertStaffAvailabilitySchema = createInsertSchema(staffAvailability).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertStaffAvailability = z.infer<typeof insertStaffAvailabilitySchema>;
export type StaffAvailability = typeof staffAvailability.$inferSelect;

// Overtime Records - Track calculated overtime for payroll
export const overtimeRecords = pgTable("overtime_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  attendanceId: varchar("attendance_id").references(() => shiftAttendance.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  overtimeMinutes: integer("overtime_minutes").notNull(),
  overtimeHours: decimal("overtime_hours", { precision: 5, scale: 2 }).notNull(), // Decimal hours for payroll
  multiplier: decimal("multiplier", { precision: 3, scale: 2 }).notNull().default("1.5"), // Overtime rate multiplier
  calculationDate: timestamp("calculation_date").notNull().defaultNow(),
  payPeriodStart: timestamp("pay_period_start").notNull(), // Start of pay period
  payPeriodEnd: timestamp("pay_period_end").notNull(), // End of pay period
  isPaid: boolean("is_paid").notNull().default(false), // Track if overtime has been paid
  paidDate: timestamp("paid_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOvertimeRecordSchema = createInsertSchema(overtimeRecords).omit({ id: true, createdAt: true });
export type InsertOvertimeRecord = z.infer<typeof insertOvertimeRecordSchema>;
export type OvertimeRecord = typeof overtimeRecords.$inferSelect;

// Marketing Campaigns - WhatsApp promotional campaigns
export const marketingCampaigns = pgTable("marketing_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  campaignType: text("campaign_type").notNull().default("promotional"), // promotional, transactional, reminder
  targetAudience: text("target_audience").notNull().default("all"), // all, loyal_customers, new_customers, inactive_customers, custom
  customSegmentFilter: jsonb("custom_segment_filter"), // JSON filters for custom targeting (e.g., {minOrders: 5, city: "Lahore"})
  messageTemplate: text("message_template").notNull(), // WhatsApp message template
  mediaUrl: text("media_url"), // Optional image/video URL for rich media
  templateVariables: jsonb("template_variables"), // Dynamic variables like {{name}}, {{offer}}, etc.
  scheduledAt: timestamp("scheduled_at"), // When to send (null = send immediately)
  status: text("status").notNull().default("draft"), // draft, scheduled, sending, completed, cancelled, failed
  branchId: varchar("branch_id").references(() => branches.id), // null = all branches
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  totalRecipients: integer("total_recipients").default(0), // Total customers targeted
  sentCount: integer("sent_count").default(0), // Successfully sent
  deliveredCount: integer("delivered_count").default(0), // Delivered to WhatsApp
  readCount: integer("read_count").default(0), // Read by recipients
  failedCount: integer("failed_count").default(0), // Failed to send
  clickCount: integer("click_count").default(0), // Clicked on links (if any)
  startedAt: timestamp("started_at"), // When campaign actually started sending
  completedAt: timestamp("completed_at"), // When campaign finished sending
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertMarketingCampaignSchema = createInsertSchema(marketingCampaigns).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMarketingCampaign = z.infer<typeof insertMarketingCampaignSchema>;
export type MarketingCampaign = typeof marketingCampaigns.$inferSelect;

// Campaign Recipients - Track individual message delivery
export const campaignRecipients = pgTable("campaign_recipients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").references(() => marketingCampaigns.id, { onDelete: "cascade" }).notNull(),
  customerId: varchar("customer_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  phoneNumber: text("phone_number").notNull(),
  personalizedMessage: text("personalized_message").notNull(), // Final message with variables replaced
  status: text("status").notNull().default("pending"), // pending, sent, delivered, read, failed, clicked
  externalMessageId: text("external_message_id"), // WhatsApp API message ID
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
  clickedAt: timestamp("clicked_at"),
  failureReason: text("failure_reason"), // Error message if failed
  retryCount: integer("retry_count").default(0),
  metadata: jsonb("metadata"), // Additional tracking data
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCampaignRecipientSchema = createInsertSchema(campaignRecipients).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCampaignRecipient = z.infer<typeof insertCampaignRecipientSchema>;
export type CampaignRecipient = typeof campaignRecipients.$inferSelect;

// Message Templates - Reusable WhatsApp message templates
export const messageTemplates = pgTable("message_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull().default("promotional"), // promotional, transactional, order_update, delivery_alert
  templateText: text("template_text").notNull(), // Message with {{variables}}
  variables: text("variables").array(), // List of available variables like ["name", "offer", "code"]
  mediaType: text("media_type"), // none, image, video, document
  mediaUrl: text("media_url"), // Default media URL (can be overridden in campaign)
  isActive: boolean("is_active").notNull().default(true),
  usageCount: integer("usage_count").default(0), // How many times used
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertMessageTemplateSchema = createInsertSchema(messageTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMessageTemplate = z.infer<typeof insertMessageTemplateSchema>;
export type MessageTemplate = typeof messageTemplates.$inferSelect;

// Customer Segments - Predefined customer groups for targeting
export const customerSegments = pgTable("customer_segments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  filters: jsonb("filters").notNull(), // {minOrders: 5, loyaltyTier: "gold", city: "Lahore", etc.}
  customerCount: integer("customer_count").default(0), // Cached count
  lastCalculated: timestamp("last_calculated"), // When count was last calculated
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCustomerSegmentSchema = createInsertSchema(customerSegments).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCustomerSegment = z.infer<typeof insertCustomerSegmentSchema>;
export type CustomerSegment = typeof customerSegments.$inferSelect;

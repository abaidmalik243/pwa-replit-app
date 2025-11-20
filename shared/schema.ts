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
  paymentMethod: text("payment_method").notNull().default("cash"), // cash, card, or jazzcash
  paymentStatus: text("payment_status").notNull().default("pending"), // pending, awaiting_verification, paid, failed, partial
  jazzCashTransactionId: text("jazzcash_transaction_id"), // JazzCash transaction ID provided by customer
  jazzCashPayerPhone: text("jazzcash_payer_phone"), // Phone number used for JazzCash payment
  jazzCashScreenshotUrl: text("jazzcash_screenshot_url"), // Optional payment screenshot URL
  items: text("items").notNull(), // JSON string
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(), // Order subtotal before delivery/discount
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"), // POS: Discount amount
  discountReason: text("discount_reason"), // POS: Reason for discount
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

// Delivery charges configuration
export const DELIVERY_CONFIG = {
  BASE_CHARGE: 50, // Fixed delivery charge in PKR
  PER_KM_CHARGE: 20, // Per kilometer charge in PKR
  FREE_DELIVERY_THRESHOLD: 1500, // Free delivery above this order amount in PKR
  MAX_DELIVERY_DISTANCE: 15, // Maximum delivery distance in KM
};

// Daily Expenses
export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  branchId: varchar("branch_id").references(() => branches.id).notNull(),
  category: text("category").notNull(), // rent, utilities, supplies, salaries, etc.
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: timestamp("date").notNull(),
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

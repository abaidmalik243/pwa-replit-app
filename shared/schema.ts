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
  role: text("role").notNull().default("customer"), // admin, staff, customer
  permissions: text("permissions").array(), // Feature-based permissions (e.g., "manage_menu", "view_reports")
  branchId: varchar("branch_id").references(() => branches.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

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
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  alternativePhone: text("alternative_phone"), // Alternative contact number
  customerAddress: text("customer_address"), // For delivery orders
  deliveryArea: text("delivery_area"), // Selected delivery area
  orderType: text("order_type").notNull().default("takeaway"), // takeaway or delivery
  paymentMethod: text("payment_method").notNull().default("cash"), // cash or jazzcash
  items: text("items").notNull(), // JSON string
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // pending, preparing, ready, completed, cancelled
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  total: z.string().or(z.number()).transform(val => typeof val === 'string' ? val : val.toString()),
});
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

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

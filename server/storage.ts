import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import * as schema from "@shared/schema";
import { eq, like, and, desc } from "drizzle-orm";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const db = drizzle(pool, { schema });

// Storage interface with all CRUD operations
export interface IStorage {
  // Users
  getUser(id: string): Promise<schema.User | undefined>;
  getUserByUsername(username: string): Promise<schema.User | undefined>;
  getUserByEmail(email: string): Promise<schema.User | undefined>;
  getAllUsers(): Promise<schema.User[]>;
  createUser(user: schema.InsertUser): Promise<schema.User>;
  updateUser(id: string, user: Partial<schema.InsertUser>): Promise<schema.User | undefined>;
  deleteUser(id: string): Promise<boolean>;

  // Branches
  getAllBranches(): Promise<schema.Branch[]>;
  getBranch(id: string): Promise<schema.Branch | undefined>;
  createBranch(branch: schema.InsertBranch): Promise<schema.Branch>;
  updateBranch(id: string, branch: Partial<schema.InsertBranch>): Promise<schema.Branch | undefined>;
  deleteBranch(id: string): Promise<boolean>;

  // Categories
  getAllCategories(): Promise<schema.Category[]>;
  getCategory(id: string): Promise<schema.Category | undefined>;
  createCategory(category: schema.InsertCategory): Promise<schema.Category>;
  updateCategory(id: string, category: Partial<schema.InsertCategory>): Promise<schema.Category | undefined>;
  deleteCategory(id: string): Promise<boolean>;

  // Menu Items
  getAllMenuItems(): Promise<schema.MenuItem[]>;
  getMenuItem(id: string): Promise<schema.MenuItem | undefined>;
  getMenuItemsByCategory(categoryId: string): Promise<schema.MenuItem[]>;
  getMenuItemsByBranch(branchId: string): Promise<schema.MenuItem[]>;
  createMenuItem(item: schema.InsertMenuItem): Promise<schema.MenuItem>;
  updateMenuItem(id: string, item: Partial<schema.InsertMenuItem>): Promise<schema.MenuItem | undefined>;
  deleteMenuItem(id: string): Promise<boolean>;

  // Orders
  getAllOrders(): Promise<schema.Order[]>;
  getOrder(id: string): Promise<schema.Order | undefined>;
  getOrdersByBranch(branchId: string): Promise<schema.Order[]>;
  getOrdersByStatus(status: string): Promise<schema.Order[]>;
  createOrder(order: schema.InsertOrder): Promise<schema.Order>;
  updateOrder(id: string, order: Partial<schema.InsertOrder>): Promise<schema.Order | undefined>;
  deleteOrder(id: string): Promise<boolean>;

  // Expenses
  getAllExpenses(): Promise<schema.Expense[]>;
  getExpense(id: string): Promise<schema.Expense | undefined>;
  getExpensesByBranch(branchId: string): Promise<schema.Expense[]>;
  createExpense(expense: schema.InsertExpense): Promise<schema.Expense>;
  updateExpense(id: string, expense: Partial<schema.InsertExpense>): Promise<schema.Expense | undefined>;
  deleteExpense(id: string): Promise<boolean>;
}

export class DbStorage implements IStorage {
  // Users
  async getUser(id: string) {
    const result = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string) {
    const result = await db.select().from(schema.users).where(eq(schema.users.username, username));
    return result[0];
  }

  async getUserByEmail(email: string) {
    const result = await db.select().from(schema.users).where(eq(schema.users.email, email));
    return result[0];
  }

  async getAllUsers() {
    return await db.select().from(schema.users).orderBy(desc(schema.users.createdAt));
  }

  async createUser(user: schema.InsertUser) {
    const result = await db.insert(schema.users).values(user).returning();
    return result[0];
  }

  async updateUser(id: string, user: Partial<schema.InsertUser>) {
    const result = await db.update(schema.users).set(user).where(eq(schema.users.id, id)).returning();
    return result[0];
  }

  async deleteUser(id: string) {
    await db.delete(schema.users).where(eq(schema.users.id, id));
    return true;
  }

  // Branches
  async getAllBranches() {
    return await db.select().from(schema.branches);
  }

  async getBranch(id: string) {
    const result = await db.select().from(schema.branches).where(eq(schema.branches.id, id));
    return result[0];
  }

  async createBranch(branch: schema.InsertBranch) {
    const result = await db.insert(schema.branches).values(branch).returning();
    return result[0];
  }

  async updateBranch(id: string, branch: Partial<schema.InsertBranch>) {
    const result = await db.update(schema.branches).set(branch).where(eq(schema.branches.id, id)).returning();
    return result[0];
  }

  async deleteBranch(id: string) {
    await db.delete(schema.branches).where(eq(schema.branches.id, id));
    return true;
  }

  // Categories
  async getAllCategories() {
    return await db.select().from(schema.categories).orderBy(desc(schema.categories.createdAt));
  }

  async getCategory(id: string) {
    const result = await db.select().from(schema.categories).where(eq(schema.categories.id, id));
    return result[0];
  }

  async createCategory(category: schema.InsertCategory) {
    const result = await db.insert(schema.categories).values(category).returning();
    return result[0];
  }

  async updateCategory(id: string, category: Partial<schema.InsertCategory>) {
    const result = await db.update(schema.categories).set(category).where(eq(schema.categories.id, id)).returning();
    return result[0];
  }

  async deleteCategory(id: string) {
    await db.delete(schema.categories).where(eq(schema.categories.id, id));
    return true;
  }

  // Menu Items
  async getAllMenuItems() {
    return await db.select().from(schema.menuItems).orderBy(desc(schema.menuItems.createdAt));
  }

  async getMenuItem(id: string) {
    const result = await db.select().from(schema.menuItems).where(eq(schema.menuItems.id, id));
    return result[0];
  }

  async getMenuItemsByCategory(categoryId: string) {
    return await db.select().from(schema.menuItems).where(eq(schema.menuItems.categoryId, categoryId));
  }

  async getMenuItemsByBranch(branchId: string) {
    return await db.select().from(schema.menuItems).where(eq(schema.menuItems.branchId, branchId));
  }

  async createMenuItem(item: schema.InsertMenuItem) {
    const result = await db.insert(schema.menuItems).values(item).returning();
    return result[0];
  }

  async updateMenuItem(id: string, item: Partial<schema.InsertMenuItem>) {
    const result = await db.update(schema.menuItems).set(item).where(eq(schema.menuItems.id, id)).returning();
    return result[0];
  }

  async deleteMenuItem(id: string) {
    await db.delete(schema.menuItems).where(eq(schema.menuItems.id, id));
    return true;
  }

  // Orders
  async getAllOrders() {
    return await db.select().from(schema.orders).orderBy(desc(schema.orders.createdAt));
  }

  async getOrder(id: string) {
    const result = await db.select().from(schema.orders).where(eq(schema.orders.id, id));
    return result[0];
  }

  async getOrdersByBranch(branchId: string) {
    return await db.select().from(schema.orders).where(eq(schema.orders.branchId, branchId)).orderBy(desc(schema.orders.createdAt));
  }

  async getOrdersByStatus(status: string) {
    return await db.select().from(schema.orders).where(eq(schema.orders.status, status)).orderBy(desc(schema.orders.createdAt));
  }

  async createOrder(order: schema.InsertOrder) {
    const result = await db.insert(schema.orders).values(order).returning();
    return result[0];
  }

  async updateOrder(id: string, order: Partial<schema.InsertOrder>) {
    const result = await db.update(schema.orders).set({ ...order, updatedAt: new Date() }).where(eq(schema.orders.id, id)).returning();
    return result[0];
  }

  async deleteOrder(id: string) {
    await db.delete(schema.orders).where(eq(schema.orders.id, id));
    return true;
  }

  // Expenses
  async getAllExpenses() {
    return await db.select().from(schema.expenses).orderBy(desc(schema.expenses.date));
  }

  async getExpense(id: string) {
    const result = await db.select().from(schema.expenses).where(eq(schema.expenses.id, id));
    return result[0];
  }

  async getExpensesByBranch(branchId: string) {
    return await db.select().from(schema.expenses).where(eq(schema.expenses.branchId, branchId)).orderBy(desc(schema.expenses.date));
  }

  async createExpense(expense: schema.InsertExpense) {
    const result = await db.insert(schema.expenses).values(expense).returning();
    return result[0];
  }

  async updateExpense(id: string, expense: Partial<schema.InsertExpense>) {
    const result = await db.update(schema.expenses).set(expense).where(eq(schema.expenses.id, id)).returning();
    return result[0];
  }

  async deleteExpense(id: string) {
    await db.delete(schema.expenses).where(eq(schema.expenses.id, id));
    return true;
  }
}

export const storage = new DbStorage();

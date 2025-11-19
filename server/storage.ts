import * as schema from "@shared/schema";
import { eq, like, and, desc, lt } from "drizzle-orm";
import { db } from "./db";

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

  // Password Reset Tokens
  createPasswordResetToken(token: schema.InsertPasswordResetToken): Promise<schema.PasswordResetToken>;
  getPasswordResetTokenByHash(tokenHash: string): Promise<schema.PasswordResetToken | undefined>;
  getAllPasswordResetTokensForUser(userId: string): Promise<schema.PasswordResetToken[]>;
  markPasswordResetTokenAsUsed(id: string): Promise<void>;
  invalidateUserPasswordResetTokens(userId: string): Promise<void>;
  deleteExpiredPasswordResetTokens(): Promise<void>;

  // POS Tables
  getAllPosTables(): Promise<schema.PosTable[]>;
  getPosTablesByBranch(branchId: string): Promise<schema.PosTable[]>;
  getPosTable(id: string): Promise<schema.PosTable | undefined>;
  createPosTable(table: schema.InsertPosTable): Promise<schema.PosTable>;
  updatePosTable(id: string, table: Partial<schema.InsertPosTable>): Promise<schema.PosTable | undefined>;
  deletePosTable(id: string): Promise<boolean>;

  // POS Sessions
  getAllPosSessions(): Promise<schema.PosSession[]>;
  getPosSessionsByBranch(branchId: string): Promise<schema.PosSession[]>;
  getActivePosSession(branchId: string): Promise<schema.PosSession | undefined>;
  getPosSession(id: string): Promise<schema.PosSession | undefined>;
  createPosSession(session: schema.InsertPosSession): Promise<schema.PosSession>;
  updatePosSession(id: string, session: Partial<schema.InsertPosSession>): Promise<schema.PosSession | undefined>;

  // Kitchen Tickets
  getAllKitchenTickets(): Promise<schema.KitchenTicket[]>;
  getKitchenTicket(id: string): Promise<schema.KitchenTicket | undefined>;
  getKitchenTicketsByOrder(orderId: string): Promise<schema.KitchenTicket[]>;
  getKitchenTicketsByStatus(status: string): Promise<schema.KitchenTicket[]>;
  createKitchenTicket(ticket: schema.InsertKitchenTicket): Promise<schema.KitchenTicket>;
  updateKitchenTicket(id: string, ticket: Partial<schema.InsertKitchenTicket>): Promise<schema.KitchenTicket | undefined>;

  // Payments
  getAllPayments(): Promise<schema.Payment[]>;
  getPayment(id: string): Promise<schema.Payment | undefined>;
  getPaymentsByOrder(orderId: string): Promise<schema.Payment[]>;
  getPaymentsBySession(sessionId: string): Promise<schema.Payment[]>;
  createPayment(payment: schema.InsertPayment): Promise<schema.Payment>;
  updatePayment(id: string, payment: Partial<schema.InsertPayment>): Promise<schema.Payment | undefined>;

  // Order Modifications
  getOrderModifications(orderId: string): Promise<schema.OrderModification[]>;
  createOrderModification(modification: schema.InsertOrderModification): Promise<schema.OrderModification>;

  // Table Reservations
  getAllTableReservations(): Promise<schema.TableReservation[]>;
  getTableReservation(id: string): Promise<schema.TableReservation | undefined>;
  getReservationsByTable(tableId: string): Promise<schema.TableReservation[]>;
  createTableReservation(reservation: schema.InsertTableReservation): Promise<schema.TableReservation>;
  updateTableReservation(id: string, reservation: Partial<schema.InsertTableReservation>): Promise<schema.TableReservation | undefined>;
  deleteTableReservation(id: string): Promise<boolean>;
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

  // Password Reset Tokens
  async createPasswordResetToken(token: schema.InsertPasswordResetToken) {
    const result = await db.insert(schema.passwordResetTokens).values(token).returning();
    return result[0];
  }

  async getPasswordResetTokenByHash(tokenHash: string) {
    const result = await db.select()
      .from(schema.passwordResetTokens)
      .where(eq(schema.passwordResetTokens.tokenHash, tokenHash));
    return result[0];
  }

  async getAllPasswordResetTokensForUser(userId: string) {
    return await db.select()
      .from(schema.passwordResetTokens)
      .where(eq(schema.passwordResetTokens.userId, userId))
      .orderBy(desc(schema.passwordResetTokens.createdAt));
  }

  async markPasswordResetTokenAsUsed(id: string) {
    await db.update(schema.passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(schema.passwordResetTokens.id, id));
  }

  async deleteExpiredPasswordResetTokens() {
    const now = new Date();
    await db.delete(schema.passwordResetTokens)
      .where(lt(schema.passwordResetTokens.expiresAt, now));
  }

  async invalidateUserPasswordResetTokens(userId: string) {
    await db.update(schema.passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(schema.passwordResetTokens.userId, userId));
  }

  // POS Tables
  async getAllPosTables() {
    return await db.select().from(schema.posTables).orderBy(desc(schema.posTables.createdAt));
  }

  async getPosTablesByBranch(branchId: string) {
    return await db.select().from(schema.posTables).where(eq(schema.posTables.branchId, branchId));
  }

  async getPosTable(id: string) {
    const result = await db.select().from(schema.posTables).where(eq(schema.posTables.id, id));
    return result[0];
  }

  async createPosTable(table: schema.InsertPosTable) {
    const result = await db.insert(schema.posTables).values(table).returning();
    return result[0];
  }

  async updatePosTable(id: string, table: Partial<schema.InsertPosTable>) {
    const result = await db.update(schema.posTables).set(table).where(eq(schema.posTables.id, id)).returning();
    return result[0];
  }

  async deletePosTable(id: string) {
    await db.delete(schema.posTables).where(eq(schema.posTables.id, id));
    return true;
  }

  // POS Sessions
  async getAllPosSessions() {
    return await db.select().from(schema.posSessions).orderBy(desc(schema.posSessions.openedAt));
  }

  async getPosSessionsByBranch(branchId: string) {
    return await db.select().from(schema.posSessions).where(eq(schema.posSessions.branchId, branchId)).orderBy(desc(schema.posSessions.openedAt));
  }

  async getActivePosSession(branchId: string) {
    const result = await db.select()
      .from(schema.posSessions)
      .where(and(
        eq(schema.posSessions.branchId, branchId),
        eq(schema.posSessions.status, "open")
      ))
      .orderBy(desc(schema.posSessions.openedAt));
    return result[0];
  }

  async getPosSession(id: string) {
    const result = await db.select().from(schema.posSessions).where(eq(schema.posSessions.id, id));
    return result[0];
  }

  async createPosSession(session: schema.InsertPosSession) {
    const result = await db.insert(schema.posSessions).values(session).returning();
    return result[0];
  }

  async updatePosSession(id: string, session: Partial<schema.InsertPosSession>) {
    const result = await db.update(schema.posSessions).set(session).where(eq(schema.posSessions.id, id)).returning();
    return result[0];
  }

  // Kitchen Tickets
  async getAllKitchenTickets() {
    return await db.select().from(schema.kitchenTickets).orderBy(desc(schema.kitchenTickets.createdAt));
  }

  async getKitchenTicket(id: string) {
    const result = await db.select().from(schema.kitchenTickets).where(eq(schema.kitchenTickets.id, id));
    return result[0];
  }

  async getKitchenTicketsByOrder(orderId: string) {
    return await db.select().from(schema.kitchenTickets).where(eq(schema.kitchenTickets.orderId, orderId));
  }

  async getKitchenTicketsByStatus(status: string) {
    return await db.select().from(schema.kitchenTickets).where(eq(schema.kitchenTickets.status, status)).orderBy(desc(schema.kitchenTickets.createdAt));
  }

  async createKitchenTicket(ticket: schema.InsertKitchenTicket) {
    const result = await db.insert(schema.kitchenTickets).values(ticket).returning();
    return result[0];
  }

  async updateKitchenTicket(id: string, ticket: Partial<schema.InsertKitchenTicket>) {
    const result = await db.update(schema.kitchenTickets).set(ticket).where(eq(schema.kitchenTickets.id, id)).returning();
    return result[0];
  }

  // Payments
  async getAllPayments() {
    return await db.select().from(schema.payments).orderBy(desc(schema.payments.createdAt));
  }

  async getPayment(id: string) {
    const result = await db.select().from(schema.payments).where(eq(schema.payments.id, id));
    return result[0];
  }

  async getPaymentsByOrder(orderId: string) {
    return await db.select().from(schema.payments).where(eq(schema.payments.orderId, orderId));
  }

  async getPaymentsBySession(sessionId: string) {
    return await db.select().from(schema.payments).where(eq(schema.payments.sessionId, sessionId));
  }

  async createPayment(payment: schema.InsertPayment) {
    const result = await db.insert(schema.payments).values(payment).returning();
    return result[0];
  }

  async updatePayment(id: string, payment: Partial<schema.InsertPayment>) {
    const result = await db.update(schema.payments).set(payment).where(eq(schema.payments.id, id)).returning();
    return result[0];
  }

  // Order Modifications
  async getOrderModifications(orderId: string) {
    return await db.select().from(schema.orderModifications).where(eq(schema.orderModifications.orderId, orderId)).orderBy(desc(schema.orderModifications.createdAt));
  }

  async createOrderModification(modification: schema.InsertOrderModification) {
    const result = await db.insert(schema.orderModifications).values(modification).returning();
    return result[0];
  }

  // Table Reservations
  async getAllTableReservations() {
    return await db.select().from(schema.tableReservations).orderBy(desc(schema.tableReservations.reservationDate));
  }

  async getTableReservation(id: string) {
    const result = await db.select().from(schema.tableReservations).where(eq(schema.tableReservations.id, id));
    return result[0];
  }

  async getReservationsByTable(tableId: string) {
    return await db.select().from(schema.tableReservations).where(eq(schema.tableReservations.tableId, tableId)).orderBy(desc(schema.tableReservations.reservationDate));
  }

  async createTableReservation(reservation: schema.InsertTableReservation) {
    const result = await db.insert(schema.tableReservations).values(reservation).returning();
    return result[0];
  }

  async updateTableReservation(id: string, reservation: Partial<schema.InsertTableReservation>) {
    const result = await db.update(schema.tableReservations).set(reservation).where(eq(schema.tableReservations.id, id)).returning();
    return result[0];
  }

  async deleteTableReservation(id: string) {
    await db.delete(schema.tableReservations).where(eq(schema.tableReservations.id, id));
    return true;
  }
}

export const storage = new DbStorage();

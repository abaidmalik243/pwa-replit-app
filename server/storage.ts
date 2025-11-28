import * as schema from "@shared/schema";
import { eq, like, and, desc, lt, gte, lte, or, sql as drizzleSql } from "drizzle-orm";
import { db } from "./db";
import { emitEvent } from "./websocket";

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
  getBestsellingMenuItems(branchId: string, days?: number, limit?: number): Promise<(schema.MenuItem & { orderCount: number })[]>;
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
  getDailyExpenses(branchId?: string): Promise<schema.Expense[]>;
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

  // Riders
  getAllRiders(): Promise<schema.Rider[]>;
  getRider(id: string): Promise<schema.Rider | undefined>;
  getRidersByBranch(branchId: string): Promise<schema.Rider[]>;
  getAvailableRiders(branchId: string): Promise<schema.Rider[]>;
  getRiderByPhone(phone: string): Promise<schema.Rider | undefined>;
  createRider(rider: schema.InsertRider): Promise<schema.Rider>;
  updateRider(id: string, rider: Partial<schema.InsertRider>): Promise<schema.Rider | undefined>;
  updateRiderLocation(id: string, latitude: string, longitude: string): Promise<schema.Rider | undefined>;
  deleteRider(id: string): Promise<boolean>;

  // Deliveries
  getAllDeliveries(): Promise<schema.Delivery[]>;
  getDelivery(id: string): Promise<schema.Delivery | undefined>;
  getDeliveriesByRider(riderId: string): Promise<schema.Delivery[]>;
  getDeliveriesByBranch(branchId: string): Promise<schema.Delivery[]>;
  getActiveDeliveriesByRider(riderId: string): Promise<schema.Delivery[]>;
  getDeliveryByOrder(orderId: string): Promise<schema.Delivery | undefined>;
  createDelivery(delivery: schema.InsertDelivery): Promise<schema.Delivery>;
  updateDelivery(id: string, delivery: Partial<schema.InsertDelivery>): Promise<schema.Delivery | undefined>;

  // Rider Location History
  getRiderLocationHistory(riderId: string, limit?: number): Promise<schema.RiderLocationHistory[]>;
  createRiderLocationHistory(location: schema.InsertRiderLocationHistory): Promise<schema.RiderLocationHistory>;

  // Promo Codes
  getAllPromoCodes(): Promise<schema.PromoCode[]>;
  getPromoCode(id: string): Promise<schema.PromoCode | undefined>;
  getPromoCodeByCode(code: string): Promise<schema.PromoCode | undefined>;
  createPromoCode(promoCode: schema.InsertPromoCode): Promise<schema.PromoCode>;
  updatePromoCode(id: string, promoCode: Partial<schema.InsertPromoCode>): Promise<schema.PromoCode | undefined>;
  deletePromoCode(id: string): Promise<boolean>;
  incrementPromoCodeUsage(id: string): Promise<void>;

  // Promo Code Usage
  getPromoCodeUsage(promoCodeId: string): Promise<schema.PromoCodeUsage[]>;
  getUserPromoCodeUsageCount(promoCodeId: string, userId: string): Promise<number>;
  createPromoCodeUsage(usage: schema.InsertPromoCodeUsage): Promise<schema.PromoCodeUsage>;

  // Delivery Charges Configuration
  getDeliveryChargesConfig(branchId: string): Promise<schema.DeliveryChargesConfig | undefined>;
  getAllDeliveryChargesConfigs(): Promise<schema.DeliveryChargesConfig[]>;
  createDeliveryChargesConfig(config: schema.InsertDeliveryChargesConfig): Promise<schema.DeliveryChargesConfig>;
  updateDeliveryChargesConfig(branchId: string, config: Partial<schema.InsertDeliveryChargesConfig>): Promise<schema.DeliveryChargesConfig | undefined>;
  deleteDeliveryChargesConfig(branchId: string): Promise<boolean>;

  // Variant Groups
  getAllVariantGroups(): Promise<schema.VariantGroup[]>;
  getVariantGroup(id: string): Promise<schema.VariantGroup | undefined>;
  createVariantGroup(group: schema.InsertVariantGroup): Promise<schema.VariantGroup>;
  updateVariantGroup(id: string, group: Partial<schema.InsertVariantGroup>): Promise<schema.VariantGroup | undefined>;
  deleteVariantGroup(id: string): Promise<boolean>;

  // Variant Options
  getAllVariantOptions(): Promise<schema.VariantOption[]>;
  getVariantOption(id: string): Promise<schema.VariantOption | undefined>;
  getVariantOptionsByGroup(groupId: string): Promise<schema.VariantOption[]>;
  createVariantOption(option: schema.InsertVariantOption): Promise<schema.VariantOption>;
  updateVariantOption(id: string, option: Partial<schema.InsertVariantOption>): Promise<schema.VariantOption | undefined>;
  deleteVariantOption(id: string): Promise<boolean>;

  // Menu Item Variants
  getMenuItemVariants(menuItemId: string): Promise<schema.MenuItemVariant[]>;
  createMenuItemVariant(menuItemVariant: schema.InsertMenuItemVariant): Promise<schema.MenuItemVariant>;
  deleteMenuItemVariant(id: string): Promise<boolean>;
  deleteMenuItemVariantsByMenuItem(menuItemId: string): Promise<boolean>;

  // Customer Addresses
  getCustomerAddresses(customerId: string): Promise<schema.CustomerAddress[]>;
  getCustomerAddress(id: string): Promise<schema.CustomerAddress | undefined>;
  createCustomerAddress(address: schema.InsertCustomerAddress): Promise<schema.CustomerAddress>;
  updateCustomerAddress(id: string, address: Partial<schema.InsertCustomerAddress>): Promise<schema.CustomerAddress | undefined>;
  deleteCustomerAddress(id: string): Promise<boolean>;
  setDefaultAddress(customerId: string, addressId: string): Promise<void>;

  // Customer Favorites
  getCustomerFavorites(customerId: string): Promise<schema.CustomerFavorite[]>;
  addFavorite(customerId: string, menuItemId: string): Promise<schema.CustomerFavorite>;
  removeFavorite(customerId: string, menuItemId: string): Promise<boolean>;
  isFavorite(customerId: string, menuItemId: string): Promise<boolean>;

  // Loyalty Points
  getLoyaltyPoints(customerId: string): Promise<schema.LoyaltyPoints | undefined>;
  createOrUpdateLoyaltyPoints(customerId: string, points: Partial<schema.InsertLoyaltyPoints>): Promise<schema.LoyaltyPoints>;
  getLoyaltyTransactions(customerId: string): Promise<schema.LoyaltyTransaction[]>;
  createLoyaltyTransaction(transaction: schema.InsertLoyaltyTransaction): Promise<schema.LoyaltyTransaction>;
  calculateEarnedPoints(orderTotal: number): Promise<number>;
  
  // Refunds
  getRefund(id: string): Promise<schema.Refund | undefined>;
  getRefundsByOrder(orderId: string): Promise<schema.Refund[]>;
  getAllRefunds(): Promise<schema.Refund[]>;
  createRefund(refund: schema.InsertRefund): Promise<schema.Refund>;
  updateRefund(id: string, refund: Partial<schema.InsertRefund>): Promise<schema.Refund | undefined>;

  // Suppliers
  getAllSuppliers(): Promise<schema.Supplier[]>;
  getSupplier(id: string): Promise<schema.Supplier | undefined>;
  createSupplier(supplier: schema.InsertSupplier): Promise<schema.Supplier>;
  updateSupplier(id: string, supplier: Partial<schema.InsertSupplier>): Promise<schema.Supplier | undefined>;
  deleteSupplier(id: string): Promise<boolean>;

  // Inventory Transactions
  getInventoryTransactions(menuItemId: string, branchId: string): Promise<schema.InventoryTransaction[]>;
  getAllInventoryTransactions(): Promise<schema.InventoryTransaction[]>;
  getInventoryTransactionsByBranch(branchId: string): Promise<schema.InventoryTransaction[]>;
  createInventoryTransaction(transaction: schema.InsertInventoryTransaction): Promise<schema.InventoryTransaction>;
  
  // Stock Wastage
  getStockWastage(branchId: string): Promise<schema.StockWastage[]>;
  createStockWastage(wastage: schema.InsertStockWastage): Promise<schema.StockWastage>;
  
  // Reorder Points
  getReorderPoints(branchId: string): Promise<schema.ReorderPoint[]>;
  getReorderPoint(id: string): Promise<schema.ReorderPoint | undefined>;
  createReorderPoint(point: schema.InsertReorderPoint): Promise<schema.ReorderPoint>;
  updateReorderPoint(id: string, point: Partial<schema.InsertReorderPoint>): Promise<schema.ReorderPoint | undefined>;
  deleteReorderPoint(id: string): Promise<boolean>;
  checkLowStock(branchId: string): Promise<Array<{menuItem: schema.MenuItem, currentStock: number, reorderLevel: number}>>;

  // Staff Shifts
  getAllStaffShifts(): Promise<schema.StaffShift[]>;
  getStaffShift(id: string): Promise<schema.StaffShift | undefined>;
  getStaffShiftsByBranch(branchId: string): Promise<schema.StaffShift[]>;
  createStaffShift(shift: schema.InsertStaffShift): Promise<schema.StaffShift>;
  updateStaffShift(id: string, shift: Partial<schema.InsertStaffShift>): Promise<schema.StaffShift | undefined>;
  deleteStaffShift(id: string): Promise<boolean>;

  // Shift Assignments
  getAllShiftAssignments(): Promise<schema.ShiftAssignment[]>;
  getShiftAssignment(id: string): Promise<schema.ShiftAssignment | undefined>;
  getShiftAssignmentsByUser(userId: string): Promise<schema.ShiftAssignment[]>;
  getShiftAssignmentsByShift(shiftId: string): Promise<schema.ShiftAssignment[]>;
  getShiftAssignmentsByDateRange(startDate: Date, endDate: Date, branchId?: string): Promise<schema.ShiftAssignment[]>;
  checkShiftConflict(userId: string, startDateTime: Date, endDateTime: Date, excludeAssignmentId?: string): Promise<boolean>;
  createShiftAssignment(assignment: schema.InsertShiftAssignment): Promise<schema.ShiftAssignment>;
  updateShiftAssignment(id: string, assignment: Partial<schema.InsertShiftAssignment>): Promise<schema.ShiftAssignment | undefined>;
  deleteShiftAssignment(id: string): Promise<boolean>;

  // Shift Attendance
  getAllShiftAttendance(): Promise<schema.ShiftAttendance[]>;
  getShiftAttendance(id: string): Promise<schema.ShiftAttendance | undefined>;
  getShiftAttendanceByAssignment(assignmentId: string): Promise<schema.ShiftAttendance | undefined>;
  getShiftAttendanceByUser(userId: string): Promise<schema.ShiftAttendance[]>;
  getActiveAttendance(userId: string): Promise<schema.ShiftAttendance | undefined>;
  clockIn(attendance: schema.InsertShiftAttendance): Promise<schema.ShiftAttendance>;
  clockOut(id: string, clockOutData: { clockOutTime: Date; clockOutLatitude?: string; clockOutLongitude?: string }): Promise<schema.ShiftAttendance | undefined>;
  updateShiftAttendance(id: string, attendance: Partial<schema.InsertShiftAttendance>): Promise<schema.ShiftAttendance | undefined>;

  // Staff Availability
  getAllStaffAvailability(): Promise<schema.StaffAvailability[]>;
  getStaffAvailability(id: string): Promise<schema.StaffAvailability | undefined>;
  getStaffAvailabilityByUser(userId: string): Promise<schema.StaffAvailability[]>;
  checkStaffAvailable(userId: string, dayOfWeek: string, time: string): Promise<boolean>;
  createStaffAvailability(availability: schema.InsertStaffAvailability): Promise<schema.StaffAvailability>;
  updateStaffAvailability(id: string, availability: Partial<schema.InsertStaffAvailability>): Promise<schema.StaffAvailability | undefined>;
  deleteStaffAvailability(id: string): Promise<boolean>;

  // Overtime Records
  getAllOvertimeRecords(): Promise<schema.OvertimeRecord[]>;
  getOvertimeRecord(id: string): Promise<schema.OvertimeRecord | undefined>;
  getOvertimeRecordsByUser(userId: string): Promise<schema.OvertimeRecord[]>;
  getOvertimeRecordsByPayPeriod(startDate: Date, endDate: Date, userId?: string): Promise<schema.OvertimeRecord[]>;
  createOvertimeRecord(record: schema.InsertOvertimeRecord): Promise<schema.OvertimeRecord>;
  updateOvertimeRecord(id: string, record: Partial<schema.InsertOvertimeRecord>): Promise<schema.OvertimeRecord | undefined>;
  markOvertimePaid(ids: string[], paidDate: Date): Promise<void>;

  // Marketing Campaigns
  getAllMarketingCampaigns(): Promise<schema.MarketingCampaign[]>;
  getMarketingCampaign(id: string): Promise<schema.MarketingCampaign | undefined>;
  getMarketingCampaignsByStatus(status: string): Promise<schema.MarketingCampaign[]>;
  getMarketingCampaignsByBranch(branchId: string): Promise<schema.MarketingCampaign[]>;
  createMarketingCampaign(campaign: schema.InsertMarketingCampaign): Promise<schema.MarketingCampaign>;
  updateMarketingCampaign(id: string, campaign: Partial<schema.InsertMarketingCampaign>): Promise<schema.MarketingCampaign | undefined>;
  deleteMarketingCampaign(id: string): Promise<boolean>;
  
  // Campaign Recipients
  getCampaignRecipients(campaignId: string): Promise<schema.CampaignRecipient[]>;
  getCampaignRecipient(id: string): Promise<schema.CampaignRecipient | undefined>;
  getCampaignRecipientsByStatus(campaignId: string, status: string): Promise<schema.CampaignRecipient[]>;
  createCampaignRecipient(recipient: schema.InsertCampaignRecipient): Promise<schema.CampaignRecipient>;
  updateCampaignRecipient(id: string, recipient: Partial<schema.InsertCampaignRecipient>): Promise<schema.CampaignRecipient | undefined>;
  bulkCreateCampaignRecipients(recipients: schema.InsertCampaignRecipient[]): Promise<schema.CampaignRecipient[]>;
  
  // Message Templates
  getAllMessageTemplates(): Promise<schema.MessageTemplate[]>;
  getMessageTemplate(id: string): Promise<schema.MessageTemplate | undefined>;
  getMessageTemplatesByCategory(category: string): Promise<schema.MessageTemplate[]>;
  createMessageTemplate(template: schema.InsertMessageTemplate): Promise<schema.MessageTemplate>;
  updateMessageTemplate(id: string, template: Partial<schema.InsertMessageTemplate>): Promise<schema.MessageTemplate | undefined>;
  deleteMessageTemplate(id: string): Promise<boolean>;
  incrementTemplateUsage(id: string): Promise<void>;
  
  // Customer Segments
  getAllCustomerSegments(): Promise<schema.CustomerSegment[]>;
  getCustomerSegment(id: string): Promise<schema.CustomerSegment | undefined>;
  createCustomerSegment(segment: schema.InsertCustomerSegment): Promise<schema.CustomerSegment>;
  updateCustomerSegment(id: string, segment: Partial<schema.InsertCustomerSegment>): Promise<schema.CustomerSegment | undefined>;
  deleteCustomerSegment(id: string): Promise<boolean>;
  calculateSegmentCustomerCount(segmentId: string): Promise<number>;
  getCustomersForSegment(filters: any): Promise<schema.User[]>;
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
    return await db.select().from(schema.users)
      .where(eq(schema.users.isDeleted, false))
      .orderBy(desc(schema.users.createdAt));
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
    // Soft delete - mark as deleted instead of actually deleting
    await db.update(schema.users)
      .set({ isDeleted: true, deletedAt: new Date() })
      .where(eq(schema.users.id, id));
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

  async getBestsellingMenuItems(branchId: string, days: number = 30, limit: number = 6) {
    // Calculate date threshold (last N days)
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);
    const dateThresholdISO = dateThreshold.toISOString();
    
    // Get completed/ready orders from the branch within the timeframe
    // Use PostgreSQL cast to compare text createdAt as timestamp
    const orders = await db.select()
      .from(schema.orders)
      .where(
        and(
          eq(schema.orders.branchId, branchId),
          or(
            eq(schema.orders.status, "completed"),
            eq(schema.orders.status, "ready")
          ),
          drizzleSql`${schema.orders.createdAt}::timestamptz >= ${dateThresholdISO}`
        )
      );
    
    // Count item occurrences by parsing JSON items
    const itemCounts = new Map<string, number>();
    
    for (const order of orders) {
      try {
        const items = JSON.parse(order.items);
        if (Array.isArray(items)) {
          for (const item of items) {
            const count = itemCounts.get(item.itemId) || 0;
            itemCounts.set(item.itemId, count + (item.quantity || 1));
          }
        }
      } catch (e) {
        console.error("Error parsing order items:", e);
      }
    }
    
    // Get all menu items and enrich with counts from the specified timeframe
    const allMenuItems = await this.getAllMenuItems();
    const itemsWithCounts = allMenuItems
      .map(item => ({
        ...item,
        orderCount: itemCounts.get(item.id) || 0,
      }))
      .filter(item => item.orderCount > 0 && item.isAvailable)
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, Math.min(limit, 12)); // Cap at 12 items max
    
    return itemsWithCounts;
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
    const createdOrder = result[0];
    emitEvent.orderCreated(createdOrder);
    return createdOrder;
  }

  async updateOrder(id: string, order: Partial<schema.InsertOrder>) {
    const result = await db.update(schema.orders).set({ ...order, updatedAt: new Date() }).where(eq(schema.orders.id, id)).returning();
    const updatedOrder = result[0];
    if (updatedOrder) {
      emitEvent.orderStatusUpdated(updatedOrder);
    }
    return updatedOrder;
  }

  async deleteOrder(id: string) {
    await db.delete(schema.orders).where(eq(schema.orders.id, id));
    return true;
  }

  // Expenses
  async getAllExpenses() {
    return await db.select().from(schema.expenses)
      .where(eq(schema.expenses.isDeleted, false))
      .orderBy(desc(schema.expenses.date));
  }

  async getExpense(id: string) {
    const result = await db.select().from(schema.expenses).where(eq(schema.expenses.id, id));
    return result[0];
  }

  async getExpensesByBranch(branchId: string) {
    return await db.select().from(schema.expenses)
      .where(and(
        eq(schema.expenses.branchId, branchId),
        eq(schema.expenses.isDeleted, false)
      ))
      .orderBy(desc(schema.expenses.date));
  }

  async getDailyExpenses(branchId?: string) {
    // Calculate the 24-hour window: 5:00 AM today to 4:59 AM tomorrow
    const now = new Date();
    const today5AM = new Date(now);
    today5AM.setHours(5, 0, 0, 0);
    
    // If current time is before 5 AM, the window started yesterday at 5 AM
    if (now.getHours() < 5) {
      today5AM.setDate(today5AM.getDate() - 1);
    }
    
    const tomorrow459AM = new Date(today5AM);
    tomorrow459AM.setDate(tomorrow459AM.getDate() + 1);
    tomorrow459AM.setHours(4, 59, 59, 999);
    
    const conditions = [
      gte(schema.expenses.date, today5AM),
      lte(schema.expenses.date, tomorrow459AM),
      eq(schema.expenses.isDeleted, false)
    ];
    
    if (branchId) {
      conditions.push(eq(schema.expenses.branchId, branchId));
    }
    
    return await db.select().from(schema.expenses)
      .where(and(...conditions))
      .orderBy(desc(schema.expenses.date));
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
    // Soft delete - mark as deleted instead of actually deleting
    await db.update(schema.expenses)
      .set({ isDeleted: true, deletedAt: new Date() })
      .where(eq(schema.expenses.id, id));
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
    const updatedTable = result[0];
    if (updatedTable) {
      emitEvent.tableStatusUpdated(updatedTable);
    }
    return updatedTable;
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
    const createdSession = result[0];
    emitEvent.posSessionUpdated(createdSession);
    return createdSession;
  }

  async updatePosSession(id: string, session: Partial<schema.InsertPosSession>) {
    const result = await db.update(schema.posSessions).set(session).where(eq(schema.posSessions.id, id)).returning();
    const updatedSession = result[0];
    if (updatedSession) {
      emitEvent.posSessionUpdated(updatedSession);
    }
    return updatedSession;
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
    const createdTicket = result[0];
    emitEvent.kitchenTicketCreated(createdTicket);
    return createdTicket;
  }

  async updateKitchenTicket(id: string, ticket: Partial<schema.InsertKitchenTicket>) {
    const result = await db.update(schema.kitchenTickets).set(ticket).where(eq(schema.kitchenTickets.id, id)).returning();
    const updatedTicket = result[0];
    if (updatedTicket) {
      emitEvent.kitchenTicketUpdated(updatedTicket);
    }
    return updatedTicket;
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

  // Riders
  async getAllRiders() {
    return await db.select().from(schema.riders).orderBy(desc(schema.riders.createdAt));
  }

  async getRider(id: string) {
    const result = await db.select().from(schema.riders).where(eq(schema.riders.id, id));
    return result[0];
  }

  async getRidersByBranch(branchId: string) {
    return await db.select().from(schema.riders).where(eq(schema.riders.branchId, branchId)).orderBy(desc(schema.riders.createdAt));
  }

  async getAvailableRiders(branchId: string) {
    return await db.select().from(schema.riders).where(
      and(
        eq(schema.riders.branchId, branchId),
        eq(schema.riders.isAvailable, true),
        eq(schema.riders.isActive, true)
      )
    ).orderBy(desc(schema.riders.createdAt));
  }

  async getRiderByPhone(phone: string) {
    const result = await db.select().from(schema.riders).where(eq(schema.riders.phone, phone));
    return result[0];
  }

  async getRiderByUserId(userId: string) {
    const result = await db.select().from(schema.riders).where(eq(schema.riders.userId, userId));
    return result[0];
  }

  async createRider(rider: schema.InsertRider) {
    const result = await db.insert(schema.riders).values(rider).returning();
    return result[0];
  }

  async updateRider(id: string, rider: Partial<schema.InsertRider>) {
    const result = await db.update(schema.riders).set(rider).where(eq(schema.riders.id, id)).returning();
    return result[0];
  }

  async updateRiderLocation(id: string, latitude: string, longitude: string) {
    const result = await db.update(schema.riders).set({
      currentLatitude: latitude,
      currentLongitude: longitude,
      lastLocationUpdate: new Date()
    }).where(eq(schema.riders.id, id)).returning();
    
    if (result[0]) {
      emitEvent.riderLocationUpdated(id, { latitude, longitude });
    }
    
    return result[0];
  }

  async deleteRider(id: string) {
    await db.delete(schema.riders).where(eq(schema.riders.id, id));
    return true;
  }

  // Deliveries
  async getAllDeliveries() {
    return await db.select().from(schema.deliveries).orderBy(desc(schema.deliveries.assignedAt));
  }

  async getDelivery(id: string) {
    const result = await db.select().from(schema.deliveries).where(eq(schema.deliveries.id, id));
    return result[0];
  }

  async getDeliveriesByRider(riderId: string) {
    return await db.select().from(schema.deliveries).where(eq(schema.deliveries.riderId, riderId)).orderBy(desc(schema.deliveries.assignedAt));
  }

  async getDeliveriesByBranch(branchId: string) {
    return await db.select().from(schema.deliveries).where(eq(schema.deliveries.branchId, branchId)).orderBy(desc(schema.deliveries.assignedAt));
  }

  async getActiveDeliveriesByRider(riderId: string) {
    return await db.select().from(schema.deliveries).where(
      and(
        eq(schema.deliveries.riderId, riderId),
        eq(schema.deliveries.status, "assigned")
      )
    ).orderBy(desc(schema.deliveries.assignedAt));
  }

  async getDeliveryByOrder(orderId: string) {
    const result = await db.select().from(schema.deliveries).where(eq(schema.deliveries.orderId, orderId));
    return result[0];
  }

  async createDelivery(delivery: schema.InsertDelivery) {
    const result = await db.insert(schema.deliveries).values(delivery).returning();
    return result[0];
  }

  async updateDelivery(id: string, delivery: Partial<schema.InsertDelivery>) {
    const result = await db.update(schema.deliveries).set(delivery).where(eq(schema.deliveries.id, id)).returning();
    const updatedDelivery = result[0];
    if (updatedDelivery) {
      emitEvent.deliveryStatusUpdated(updatedDelivery);
    }
    return updatedDelivery;
  }

  // Rider Location History
  async getRiderLocationHistory(riderId: string, limit: number = 100) {
    return await db.select().from(schema.riderLocationHistory)
      .where(eq(schema.riderLocationHistory.riderId, riderId))
      .orderBy(desc(schema.riderLocationHistory.timestamp))
      .limit(limit);
  }

  async createRiderLocationHistory(location: schema.InsertRiderLocationHistory) {
    const result = await db.insert(schema.riderLocationHistory).values(location).returning();
    return result[0];
  }

  // Promo Codes
  async getAllPromoCodes() {
    return await db.select().from(schema.promoCodes).orderBy(desc(schema.promoCodes.createdAt));
  }

  async getPromoCode(id: string) {
    const result = await db.select().from(schema.promoCodes).where(eq(schema.promoCodes.id, id));
    return result[0];
  }

  async getPromoCodeByCode(code: string) {
    const result = await db.select().from(schema.promoCodes).where(eq(schema.promoCodes.code, code));
    return result[0];
  }

  async createPromoCode(promoCode: schema.InsertPromoCode) {
    const result = await db.insert(schema.promoCodes).values(promoCode).returning();
    return result[0];
  }

  async updatePromoCode(id: string, promoCode: Partial<schema.InsertPromoCode>) {
    const result = await db.update(schema.promoCodes).set(promoCode).where(eq(schema.promoCodes.id, id)).returning();
    return result[0];
  }

  async deletePromoCode(id: string) {
    await db.delete(schema.promoCodes).where(eq(schema.promoCodes.id, id));
    return true;
  }

  async incrementPromoCodeUsage(id: string) {
    const promoCode = await this.getPromoCode(id);
    if (promoCode) {
      await db.update(schema.promoCodes)
        .set({ usageCount: (promoCode.usageCount || 0) + 1 })
        .where(eq(schema.promoCodes.id, id));
    }
  }

  // Promo Code Usage
  async getPromoCodeUsage(promoCodeId: string) {
    return await db.select().from(schema.promoCodeUsage).where(eq(schema.promoCodeUsage.promoCodeId, promoCodeId)).orderBy(desc(schema.promoCodeUsage.usedAt));
  }

  async getUserPromoCodeUsageCount(promoCodeId: string, userId: string) {
    const result = await db.select().from(schema.promoCodeUsage).where(
      and(
        eq(schema.promoCodeUsage.promoCodeId, promoCodeId),
        eq(schema.promoCodeUsage.userId, userId)
      )
    );
    return result.length;
  }

  async createPromoCodeUsage(usage: schema.InsertPromoCodeUsage) {
    const result = await db.insert(schema.promoCodeUsage).values(usage).returning();
    return result[0];
  }

  // Delivery Charges Configuration
  async getDeliveryChargesConfig(branchId: string) {
    const result = await db.select().from(schema.deliveryChargesConfig).where(eq(schema.deliveryChargesConfig.branchId, branchId));
    return result[0];
  }

  async getAllDeliveryChargesConfigs() {
    return await db.select().from(schema.deliveryChargesConfig);
  }

  async createDeliveryChargesConfig(config: schema.InsertDeliveryChargesConfig) {
    const result = await db.insert(schema.deliveryChargesConfig).values(config).returning();
    return result[0];
  }

  async updateDeliveryChargesConfig(branchId: string, config: Partial<schema.InsertDeliveryChargesConfig>) {
    const result = await db.update(schema.deliveryChargesConfig)
      .set({ ...config, updatedAt: new Date() })
      .where(eq(schema.deliveryChargesConfig.branchId, branchId))
      .returning();
    return result[0];
  }

  async deleteDeliveryChargesConfig(branchId: string) {
    await db.delete(schema.deliveryChargesConfig).where(eq(schema.deliveryChargesConfig.branchId, branchId));
    return true;
  }

  // Variant Groups
  async getAllVariantGroups() {
    return await db.select().from(schema.variantGroups).orderBy(schema.variantGroups.displayOrder, desc(schema.variantGroups.createdAt));
  }

  async getVariantGroup(id: string) {
    const result = await db.select().from(schema.variantGroups).where(eq(schema.variantGroups.id, id));
    return result[0];
  }

  async createVariantGroup(group: schema.InsertVariantGroup) {
    const result = await db.insert(schema.variantGroups).values(group).returning();
    return result[0];
  }

  async updateVariantGroup(id: string, group: Partial<schema.InsertVariantGroup>) {
    const result = await db.update(schema.variantGroups).set(group).where(eq(schema.variantGroups.id, id)).returning();
    return result[0];
  }

  async deleteVariantGroup(id: string) {
    await db.delete(schema.variantGroups).where(eq(schema.variantGroups.id, id));
    return true;
  }

  // Variant Options
  async getAllVariantOptions() {
    return await db.select().from(schema.variantOptions).orderBy(schema.variantOptions.displayOrder);
  }

  async getVariantOption(id: string) {
    const result = await db.select().from(schema.variantOptions).where(eq(schema.variantOptions.id, id));
    return result[0];
  }

  async getVariantOptionsByGroup(groupId: string) {
    return await db.select().from(schema.variantOptions)
      .where(eq(schema.variantOptions.variantGroupId, groupId))
      .orderBy(schema.variantOptions.displayOrder);
  }

  async createVariantOption(option: schema.InsertVariantOption) {
    const result = await db.insert(schema.variantOptions).values(option).returning();
    return result[0];
  }

  async updateVariantOption(id: string, option: Partial<schema.InsertVariantOption>) {
    const result = await db.update(schema.variantOptions).set(option).where(eq(schema.variantOptions.id, id)).returning();
    return result[0];
  }

  async deleteVariantOption(id: string) {
    await db.delete(schema.variantOptions).where(eq(schema.variantOptions.id, id));
    return true;
  }

  // Menu Item Variants
  async getMenuItemVariants(menuItemId: string) {
    return await db.select().from(schema.menuItemVariants).where(eq(schema.menuItemVariants.menuItemId, menuItemId));
  }

  async createMenuItemVariant(menuItemVariant: schema.InsertMenuItemVariant) {
    const result = await db.insert(schema.menuItemVariants).values(menuItemVariant).returning();
    return result[0];
  }

  async deleteMenuItemVariant(id: string) {
    await db.delete(schema.menuItemVariants).where(eq(schema.menuItemVariants.id, id));
    return true;
  }

  async deleteMenuItemVariantsByMenuItem(menuItemId: string) {
    await db.delete(schema.menuItemVariants).where(eq(schema.menuItemVariants.menuItemId, menuItemId));
    return true;
  }

  // Customer Addresses
  async getCustomerAddresses(customerId: string) {
    return await db.select().from(schema.customerAddresses)
      .where(eq(schema.customerAddresses.customerId, customerId))
      .orderBy(desc(schema.customerAddresses.isDefault), desc(schema.customerAddresses.createdAt));
  }

  async getCustomerAddress(id: string) {
    const result = await db.select().from(schema.customerAddresses).where(eq(schema.customerAddresses.id, id));
    return result[0];
  }

  async createCustomerAddress(address: schema.InsertCustomerAddress) {
    const result = await db.insert(schema.customerAddresses).values(address).returning();
    return result[0];
  }

  async updateCustomerAddress(id: string, address: Partial<schema.InsertCustomerAddress>) {
    // SECURITY: Remove customerId from address object to prevent tampering
    const { customerId, ...safeAddress } = address;
    
    const result = await db.update(schema.customerAddresses)
      .set({ ...safeAddress, updatedAt: new Date() })
      .where(eq(schema.customerAddresses.id, id))
      .returning();
    return result[0];
  }

  async deleteCustomerAddress(id: string) {
    const result = await db.delete(schema.customerAddresses)
      .where(eq(schema.customerAddresses.id, id))
      .returning();
    return result.length > 0;
  }

  async setDefaultAddress(customerId: string, addressId: string) {
    // Unset all addresses as default for this customer
    await db.update(schema.customerAddresses)
      .set({ isDefault: false })
      .where(eq(schema.customerAddresses.customerId, customerId));
    
    // Set the specified address as default
    await db.update(schema.customerAddresses)
      .set({ isDefault: true })
      .where(eq(schema.customerAddresses.id, addressId));
  }

  // Customer Favorites
  async getCustomerFavorites(customerId: string) {
    return await db.select().from(schema.customerFavorites)
      .where(eq(schema.customerFavorites.customerId, customerId))
      .orderBy(desc(schema.customerFavorites.createdAt));
  }

  async addFavorite(customerId: string, menuItemId: string) {
    const result = await db.insert(schema.customerFavorites)
      .values({ customerId, menuItemId })
      .returning();
    return result[0];
  }

  async removeFavorite(customerId: string, menuItemId: string) {
    await db.delete(schema.customerFavorites)
      .where(and(
        eq(schema.customerFavorites.customerId, customerId),
        eq(schema.customerFavorites.menuItemId, menuItemId)
      ));
    return true;
  }

  async isFavorite(customerId: string, menuItemId: string) {
    const result = await db.select().from(schema.customerFavorites)
      .where(and(
        eq(schema.customerFavorites.customerId, customerId),
        eq(schema.customerFavorites.menuItemId, menuItemId)
      ));
    return result.length > 0;
  }

  // Loyalty Points
  async getLoyaltyPoints(customerId: string) {
    const result = await db.select().from(schema.loyaltyPoints)
      .where(eq(schema.loyaltyPoints.customerId, customerId));
    return result[0];
  }

  async createOrUpdateLoyaltyPoints(customerId: string, points: Partial<schema.InsertLoyaltyPoints>) {
    const existing = await this.getLoyaltyPoints(customerId);
    
    if (existing) {
      const result = await db.update(schema.loyaltyPoints)
        .set({ ...points, updatedAt: new Date() })
        .where(eq(schema.loyaltyPoints.customerId, customerId))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(schema.loyaltyPoints)
        .values({ customerId, ...points } as schema.InsertLoyaltyPoints)
        .returning();
      return result[0];
    }
  }

  async getLoyaltyTransactions(customerId: string) {
    return await db.select().from(schema.loyaltyTransactions)
      .where(eq(schema.loyaltyTransactions.customerId, customerId))
      .orderBy(desc(schema.loyaltyTransactions.createdAt));
  }

  async createLoyaltyTransaction(transaction: schema.InsertLoyaltyTransaction) {
    const result = await db.insert(schema.loyaltyTransactions).values(transaction).returning();
    return result[0];
  }

  async calculateEarnedPoints(orderTotal: number) {
    // 1 point per Rs. 100 spent
    return Math.floor(orderTotal / 100);
  }

  // Refunds
  async getRefund(id: string) {
    const result = await db.select().from(schema.refunds).where(eq(schema.refunds.id, id));
    return result[0];
  }

  async getRefundsByOrder(orderId: string) {
    return await db.select().from(schema.refunds)
      .where(eq(schema.refunds.orderId, orderId))
      .orderBy(desc(schema.refunds.requestedAt));
  }

  async getAllRefunds() {
    return await db.select().from(schema.refunds).orderBy(desc(schema.refunds.requestedAt));
  }

  async createRefund(refund: schema.InsertRefund) {
    const result = await db.insert(schema.refunds).values(refund).returning();
    return result[0];
  }

  async updateRefund(id: string, refund: Partial<schema.InsertRefund>) {
    const result = await db.update(schema.refunds)
      .set(refund)
      .where(eq(schema.refunds.id, id))
      .returning();
    return result[0];
  }

  // Suppliers
  async getAllSuppliers() {
    return await db.select().from(schema.suppliers).orderBy(schema.suppliers.name);
  }

  async getSupplier(id: string) {
    const result = await db.select().from(schema.suppliers).where(eq(schema.suppliers.id, id));
    return result[0];
  }

  async createSupplier(supplier: schema.InsertSupplier) {
    const result = await db.insert(schema.suppliers).values(supplier).returning();
    return result[0];
  }

  async updateSupplier(id: string, supplier: Partial<schema.InsertSupplier>) {
    const result = await db.update(schema.suppliers)
      .set(supplier)
      .where(eq(schema.suppliers.id, id))
      .returning();
    return result[0];
  }

  async deleteSupplier(id: string) {
    await db.delete(schema.suppliers).where(eq(schema.suppliers.id, id));
    return true;
  }

  // Inventory Transactions
  async getInventoryTransactions(menuItemId: string, branchId: string) {
    return await db.select().from(schema.inventoryTransactions)
      .where(and(
        eq(schema.inventoryTransactions.menuItemId, menuItemId),
        eq(schema.inventoryTransactions.branchId, branchId)
      ))
      .orderBy(desc(schema.inventoryTransactions.createdAt));
  }

  async getAllInventoryTransactions() {
    return await db.select().from(schema.inventoryTransactions)
      .orderBy(desc(schema.inventoryTransactions.createdAt));
  }

  async getInventoryTransactionsByBranch(branchId: string) {
    return await db.select().from(schema.inventoryTransactions)
      .where(eq(schema.inventoryTransactions.branchId, branchId))
      .orderBy(desc(schema.inventoryTransactions.createdAt));
  }

  async createInventoryTransaction(transaction: schema.InsertInventoryTransaction) {
    const result = await db.insert(schema.inventoryTransactions).values(transaction).returning();
    
    // Update menu item stock quantity
    const menuItem = await this.getMenuItem(transaction.menuItemId);
    if (menuItem) {
      await this.updateMenuItem(transaction.menuItemId, {
        stockQuantity: transaction.balanceAfter
      });
    }
    
    return result[0];
  }

  // Stock Wastage
  async getStockWastage(branchId: string) {
    return await db.select().from(schema.stockWastage)
      .where(eq(schema.stockWastage.branchId, branchId))
      .orderBy(desc(schema.stockWastage.wasteDate));
  }

  async createStockWastage(wastage: schema.InsertStockWastage) {
    const result = await db.insert(schema.stockWastage).values(wastage).returning();
    
    // Create corresponding inventory transaction
    const menuItem = await this.getMenuItem(wastage.menuItemId);
    if (menuItem) {
      const newBalance = (menuItem.stockQuantity || 0) - wastage.quantity;
      await this.createInventoryTransaction({
        menuItemId: wastage.menuItemId,
        branchId: wastage.branchId,
        transactionType: 'wastage',
        quantity: -wastage.quantity,
        balanceAfter: newBalance,
        reason: wastage.reason,
        performedBy: wastage.reportedBy || undefined,
      });
    }
    
    return result[0];
  }

  // Reorder Points
  async getReorderPoints(branchId: string) {
    return await db.select().from(schema.reorderPoints)
      .where(eq(schema.reorderPoints.branchId, branchId))
      .orderBy(schema.reorderPoints.createdAt);
  }

  async getReorderPoint(id: string) {
    const result = await db.select().from(schema.reorderPoints).where(eq(schema.reorderPoints.id, id));
    return result[0];
  }

  async createReorderPoint(point: schema.InsertReorderPoint) {
    const result = await db.insert(schema.reorderPoints).values(point).returning();
    return result[0];
  }

  async updateReorderPoint(id: string, point: Partial<schema.InsertReorderPoint>) {
    const result = await db.update(schema.reorderPoints)
      .set({ ...point, updatedAt: new Date() })
      .where(eq(schema.reorderPoints.id, id))
      .returning();
    return result[0];
  }

  async deleteReorderPoint(id: string) {
    await db.delete(schema.reorderPoints).where(eq(schema.reorderPoints.id, id));
    return true;
  }

  async checkLowStock(branchId: string) {
    // Get all reorder points for this branch
    const reorderPoints = await this.getReorderPoints(branchId);
    const lowStockItems: Array<{menuItem: schema.MenuItem, currentStock: number, reorderLevel: number}> = [];
    
    for (const point of reorderPoints) {
      if (!point.isActive) continue;
      
      const menuItem = await this.getMenuItem(point.menuItemId);
      if (!menuItem) continue;
      
      const currentStock = menuItem.stockQuantity || 0;
      if (currentStock <= point.reorderLevel) {
        lowStockItems.push({
          menuItem,
          currentStock,
          reorderLevel: point.reorderLevel
        });
      }
    }
    
    return lowStockItems;
  }

  // Staff Shifts
  async getAllStaffShifts() {
    return await db.select().from(schema.staffShifts).orderBy(schema.staffShifts.branchId, schema.staffShifts.startTime);
  }

  async getStaffShift(id: string) {
    const result = await db.select().from(schema.staffShifts).where(eq(schema.staffShifts.id, id));
    return result[0];
  }

  async getStaffShiftsByBranch(branchId: string) {
    return await db.select().from(schema.staffShifts)
      .where(eq(schema.staffShifts.branchId, branchId))
      .orderBy(schema.staffShifts.startTime);
  }

  async createStaffShift(shift: schema.InsertStaffShift) {
    const result = await db.insert(schema.staffShifts).values(shift).returning();
    return result[0];
  }

  async updateStaffShift(id: string, shift: Partial<schema.InsertStaffShift>) {
    const result = await db.update(schema.staffShifts)
      .set({ ...shift, updatedAt: new Date() })
      .where(eq(schema.staffShifts.id, id))
      .returning();
    return result[0];
  }

  async deleteStaffShift(id: string) {
    await db.delete(schema.staffShifts).where(eq(schema.staffShifts.id, id));
    return true;
  }

  // Shift Assignments
  async getAllShiftAssignments() {
    return await db.select().from(schema.shiftAssignments).orderBy(desc(schema.shiftAssignments.startDateTime));
  }

  async getShiftAssignment(id: string) {
    const result = await db.select().from(schema.shiftAssignments).where(eq(schema.shiftAssignments.id, id));
    return result[0];
  }

  async getShiftAssignmentsByUser(userId: string) {
    return await db.select().from(schema.shiftAssignments)
      .where(eq(schema.shiftAssignments.userId, userId))
      .orderBy(desc(schema.shiftAssignments.startDateTime));
  }

  async getShiftAssignmentsByShift(shiftId: string) {
    return await db.select().from(schema.shiftAssignments)
      .where(eq(schema.shiftAssignments.shiftId, shiftId))
      .orderBy(desc(schema.shiftAssignments.assignmentDate));
  }

  async getShiftAssignmentsByDateRange(startDate: Date, endDate: Date, branchId?: string) {
    let query = db.select().from(schema.shiftAssignments)
      .where(
        and(
          gte(schema.shiftAssignments.startDateTime, startDate),
          lte(schema.shiftAssignments.endDateTime, endDate)
        )
      );
    
    if (branchId) {
      // Join with staffShifts to filter by branch
      query = db.select().from(schema.shiftAssignments)
        .innerJoin(schema.staffShifts, eq(schema.shiftAssignments.shiftId, schema.staffShifts.id))
        .where(
          and(
            gte(schema.shiftAssignments.startDateTime, startDate),
            lte(schema.shiftAssignments.endDateTime, endDate),
            eq(schema.staffShifts.branchId, branchId)
          )
        );
    }
    
    return await query.orderBy(schema.shiftAssignments.startDateTime) as any;
  }

  async checkShiftConflict(userId: string, startDateTime: Date, endDateTime: Date, excludeAssignmentId?: string): Promise<boolean> {
    let conditions = and(
      eq(schema.shiftAssignments.userId, userId),
      or(
        // Overlapping conditions
        and(
          lte(schema.shiftAssignments.startDateTime, startDateTime),
          gte(schema.shiftAssignments.endDateTime, startDateTime)
        ),
        and(
          lte(schema.shiftAssignments.startDateTime, endDateTime),
          gte(schema.shiftAssignments.endDateTime, endDateTime)
        ),
        and(
          gte(schema.shiftAssignments.startDateTime, startDateTime),
          lte(schema.shiftAssignments.endDateTime, endDateTime)
        )
      )
    );

    if (excludeAssignmentId) {
      conditions = and(
        conditions,
        drizzleSql`${schema.shiftAssignments.id} != ${excludeAssignmentId}`
      );
    }

    const conflicts = await db.select().from(schema.shiftAssignments).where(conditions);
    return conflicts.length > 0;
  }

  async createShiftAssignment(assignment: schema.InsertShiftAssignment) {
    const result = await db.insert(schema.shiftAssignments).values(assignment).returning();
    
    // Emit WebSocket event for real-time updates
    emitEvent.shiftAssigned(result[0]);
    
    return result[0];
  }

  async updateShiftAssignment(id: string, assignment: Partial<schema.InsertShiftAssignment>) {
    const result = await db.update(schema.shiftAssignments)
      .set({ ...assignment, updatedAt: new Date() })
      .where(eq(schema.shiftAssignments.id, id))
      .returning();
    
    if (result[0]) {
      emitEvent.shiftUpdated(result[0]);
    }
    
    return result[0];
  }

  async deleteShiftAssignment(id: string) {
    await db.delete(schema.shiftAssignments).where(eq(schema.shiftAssignments.id, id));
    emitEvent.shiftDeleted({ id });
    return true;
  }

  // Shift Attendance
  async getAllShiftAttendance() {
    return await db.select().from(schema.shiftAttendance).orderBy(desc(schema.shiftAttendance.clockInTime));
  }

  async getShiftAttendance(id: string) {
    const result = await db.select().from(schema.shiftAttendance).where(eq(schema.shiftAttendance.id, id));
    return result[0];
  }

  async getShiftAttendanceByAssignment(assignmentId: string) {
    const result = await db.select().from(schema.shiftAttendance)
      .where(eq(schema.shiftAttendance.assignmentId, assignmentId));
    return result[0];
  }

  async getShiftAttendanceByUser(userId: string) {
    return await db.select().from(schema.shiftAttendance)
      .where(eq(schema.shiftAttendance.userId, userId))
      .orderBy(desc(schema.shiftAttendance.clockInTime));
  }

  async getActiveAttendance(userId: string) {
    const result = await db.select().from(schema.shiftAttendance)
      .where(
        and(
          eq(schema.shiftAttendance.userId, userId),
          eq(schema.shiftAttendance.status, 'clocked_in')
        )
      )
      .orderBy(desc(schema.shiftAttendance.clockInTime))
      .limit(1);
    return result[0];
  }

  async clockIn(attendance: schema.InsertShiftAttendance) {
    const result = await db.insert(schema.shiftAttendance).values(attendance).returning();
    
    // Update assignment status to in_progress
    if (attendance.assignmentId) {
      await this.updateShiftAssignment(attendance.assignmentId, { status: 'in_progress' });
    }
    
    emitEvent.attendanceClockIn(result[0]);
    return result[0];
  }

  async clockOut(id: string, clockOutData: { clockOutTime: Date; clockOutLatitude?: string; clockOutLongitude?: string }) {
    const attendance = await this.getShiftAttendance(id);
    if (!attendance) return undefined;

    // Calculate total minutes worked
    const clockInTime = new Date(attendance.clockInTime);
    const clockOutTime = clockOutData.clockOutTime;
    const totalMinutesWorked = Math.floor((clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60));

    // Get shift details to calculate overtime
    const assignment = await this.getShiftAssignment(attendance.assignmentId);
    let regularMinutes = totalMinutesWorked;
    let overtimeMinutes = 0;

    if (assignment) {
      const shift = await this.getStaffShift(assignment.shiftId);
      if (shift) {
        const standardMinutes = shift.durationMinutes - (shift.breakDurationMinutes || 0);
        if (totalMinutesWorked > standardMinutes) {
          regularMinutes = standardMinutes;
          overtimeMinutes = totalMinutesWorked - standardMinutes;
        }
      }
    }

    const result = await db.update(schema.shiftAttendance)
      .set({
        clockOutTime: clockOutData.clockOutTime,
        clockOutLatitude: clockOutData.clockOutLatitude,
        clockOutLongitude: clockOutData.clockOutLongitude,
        totalMinutesWorked,
        regularMinutes,
        overtimeMinutes,
        status: 'clocked_out',
        updatedAt: new Date(),
      })
      .where(eq(schema.shiftAttendance.id, id))
      .returning();

    // Create overtime record if applicable
    if (overtimeMinutes > 0 && assignment) {
      const shift = await this.getStaffShift(assignment.shiftId);
      const overtimeHours = overtimeMinutes / 60;
      
      await this.createOvertimeRecord({
        attendanceId: id,
        userId: attendance.userId,
        overtimeMinutes,
        overtimeHours: overtimeHours.toString(),
        multiplier: shift?.overtimeMultiplier || "1.5",
        payPeriodStart: new Date(assignment.assignmentDate),
        payPeriodEnd: new Date(assignment.assignmentDate),
      });
    }

    // Update assignment status to completed
    if (attendance.assignmentId) {
      await this.updateShiftAssignment(attendance.assignmentId, { status: 'completed' });
    }

    if (result[0]) {
      emitEvent.attendanceClockOut(result[0]);
    }

    return result[0];
  }

  async updateShiftAttendance(id: string, attendance: Partial<schema.InsertShiftAttendance>) {
    const result = await db.update(schema.shiftAttendance)
      .set({ ...attendance, updatedAt: new Date() })
      .where(eq(schema.shiftAttendance.id, id))
      .returning();
    return result[0];
  }

  // Staff Availability
  async getAllStaffAvailability() {
    return await db.select().from(schema.staffAvailability).orderBy(schema.staffAvailability.userId, schema.staffAvailability.dayOfWeek);
  }

  async getStaffAvailability(id: string) {
    const result = await db.select().from(schema.staffAvailability).where(eq(schema.staffAvailability.id, id));
    return result[0];
  }

  async getStaffAvailabilityByUser(userId: string) {
    return await db.select().from(schema.staffAvailability)
      .where(eq(schema.staffAvailability.userId, userId))
      .orderBy(schema.staffAvailability.dayOfWeek, schema.staffAvailability.availableFrom);
  }

  async checkStaffAvailable(userId: string, dayOfWeek: string, time: string): Promise<boolean> {
    const availability = await db.select().from(schema.staffAvailability)
      .where(
        and(
          eq(schema.staffAvailability.userId, userId),
          eq(schema.staffAvailability.dayOfWeek, dayOfWeek.toLowerCase()),
          eq(schema.staffAvailability.isActive, true),
          lte(schema.staffAvailability.availableFrom, time),
          gte(schema.staffAvailability.availableTo, time)
        )
      );
    return availability.length > 0;
  }

  async createStaffAvailability(availability: schema.InsertStaffAvailability) {
    const result = await db.insert(schema.staffAvailability).values(availability).returning();
    return result[0];
  }

  async updateStaffAvailability(id: string, availability: Partial<schema.InsertStaffAvailability>) {
    const result = await db.update(schema.staffAvailability)
      .set({ ...availability, updatedAt: new Date() })
      .where(eq(schema.staffAvailability.id, id))
      .returning();
    return result[0];
  }

  async deleteStaffAvailability(id: string) {
    await db.delete(schema.staffAvailability).where(eq(schema.staffAvailability.id, id));
    return true;
  }

  // Overtime Records
  async getAllOvertimeRecords() {
    return await db.select().from(schema.overtimeRecords).orderBy(desc(schema.overtimeRecords.calculationDate));
  }

  async getOvertimeRecord(id: string) {
    const result = await db.select().from(schema.overtimeRecords).where(eq(schema.overtimeRecords.id, id));
    return result[0];
  }

  async getOvertimeRecordsByUser(userId: string) {
    return await db.select().from(schema.overtimeRecords)
      .where(eq(schema.overtimeRecords.userId, userId))
      .orderBy(desc(schema.overtimeRecords.calculationDate));
  }

  async getOvertimeRecordsByPayPeriod(startDate: Date, endDate: Date, userId?: string) {
    let conditions = and(
      gte(schema.overtimeRecords.payPeriodStart, startDate),
      lte(schema.overtimeRecords.payPeriodEnd, endDate)
    );

    if (userId) {
      conditions = and(conditions, eq(schema.overtimeRecords.userId, userId));
    }

    return await db.select().from(schema.overtimeRecords)
      .where(conditions)
      .orderBy(schema.overtimeRecords.payPeriodStart);
  }

  async createOvertimeRecord(record: schema.InsertOvertimeRecord) {
    const result = await db.insert(schema.overtimeRecords).values(record).returning();
    return result[0];
  }

  async updateOvertimeRecord(id: string, record: Partial<schema.InsertOvertimeRecord>) {
    const result = await db.update(schema.overtimeRecords)
      .set(record)
      .where(eq(schema.overtimeRecords.id, id))
      .returning();
    return result[0];
  }

  async markOvertimePaid(ids: string[], paidDate: Date) {
    await db.update(schema.overtimeRecords)
      .set({ isPaid: true, paidDate })
      .where(drizzleSql`${schema.overtimeRecords.id} = ANY(${ids})`);
  }

  // Marketing Campaigns
  async getAllMarketingCampaigns() {
    return await db.select().from(schema.marketingCampaigns).orderBy(desc(schema.marketingCampaigns.createdAt));
  }

  async getMarketingCampaign(id: string) {
    const result = await db.select().from(schema.marketingCampaigns).where(eq(schema.marketingCampaigns.id, id));
    return result[0];
  }

  async getMarketingCampaignsByStatus(status: string) {
    return await db.select().from(schema.marketingCampaigns)
      .where(eq(schema.marketingCampaigns.status, status))
      .orderBy(desc(schema.marketingCampaigns.createdAt));
  }

  async getMarketingCampaignsByBranch(branchId: string) {
    return await db.select().from(schema.marketingCampaigns)
      .where(eq(schema.marketingCampaigns.branchId, branchId))
      .orderBy(desc(schema.marketingCampaigns.createdAt));
  }

  async createMarketingCampaign(campaign: schema.InsertMarketingCampaign) {
    const result = await db.insert(schema.marketingCampaigns).values(campaign).returning();
    return result[0];
  }

  async updateMarketingCampaign(id: string, campaign: Partial<schema.InsertMarketingCampaign>) {
    const result = await db.update(schema.marketingCampaigns)
      .set({ ...campaign, updatedAt: new Date() })
      .where(eq(schema.marketingCampaigns.id, id))
      .returning();
    return result[0];
  }

  async deleteMarketingCampaign(id: string) {
    await db.delete(schema.marketingCampaigns).where(eq(schema.marketingCampaigns.id, id));
    return true;
  }

  // Campaign Recipients
  async getCampaignRecipients(campaignId: string) {
    return await db.select().from(schema.campaignRecipients)
      .where(eq(schema.campaignRecipients.campaignId, campaignId))
      .orderBy(schema.campaignRecipients.createdAt);
  }

  async getCampaignRecipient(id: string) {
    const result = await db.select().from(schema.campaignRecipients).where(eq(schema.campaignRecipients.id, id));
    return result[0];
  }

  async getCampaignRecipientsByStatus(campaignId: string, status: string) {
    return await db.select().from(schema.campaignRecipients)
      .where(
        and(
          eq(schema.campaignRecipients.campaignId, campaignId),
          eq(schema.campaignRecipients.status, status)
        )
      );
  }

  async createCampaignRecipient(recipient: schema.InsertCampaignRecipient) {
    const result = await db.insert(schema.campaignRecipients).values(recipient).returning();
    return result[0];
  }

  async updateCampaignRecipient(id: string, recipient: Partial<schema.InsertCampaignRecipient>) {
    const result = await db.update(schema.campaignRecipients)
      .set({ ...recipient, updatedAt: new Date() })
      .where(eq(schema.campaignRecipients.id, id))
      .returning();
    return result[0];
  }

  async bulkCreateCampaignRecipients(recipients: schema.InsertCampaignRecipient[]) {
    const result = await db.insert(schema.campaignRecipients).values(recipients).returning();
    return result;
  }

  // Message Templates
  async getAllMessageTemplates() {
    const result = await db.select().from(schema.messageTemplates).orderBy(desc(schema.messageTemplates.createdAt));
    console.log(`[storage.getAllMessageTemplates] Fetched ${result.length} templates from database`);
    return result;
  }

  async getMessageTemplate(id: string) {
    const result = await db.select().from(schema.messageTemplates).where(eq(schema.messageTemplates.id, id));
    return result[0];
  }

  async getMessageTemplatesByCategory(category: string) {
    return await db.select().from(schema.messageTemplates)
      .where(eq(schema.messageTemplates.category, category))
      .orderBy(desc(schema.messageTemplates.usageCount));
  }

  async createMessageTemplate(template: schema.InsertMessageTemplate) {
    console.log(`[storage.createMessageTemplate] Inserting template:`, template);
    const result = await db.insert(schema.messageTemplates).values(template).returning();
    console.log(`[storage.createMessageTemplate] Inserted template:`, result[0]);
    return result[0];
  }

  async updateMessageTemplate(id: string, template: Partial<schema.InsertMessageTemplate>) {
    const result = await db.update(schema.messageTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(schema.messageTemplates.id, id))
      .returning();
    return result[0];
  }

  async deleteMessageTemplate(id: string) {
    await db.delete(schema.messageTemplates).where(eq(schema.messageTemplates.id, id));
    return true;
  }

  async incrementTemplateUsage(id: string) {
    await db.update(schema.messageTemplates)
      .set({ usageCount: drizzleSql`${schema.messageTemplates.usageCount} + 1`, updatedAt: new Date() })
      .where(eq(schema.messageTemplates.id, id));
  }

  // Customer Segments
  async getAllCustomerSegments() {
    return await db.select().from(schema.customerSegments).orderBy(desc(schema.customerSegments.createdAt));
  }

  async getCustomerSegment(id: string) {
    const result = await db.select().from(schema.customerSegments).where(eq(schema.customerSegments.id, id));
    return result[0];
  }

  async createCustomerSegment(segment: schema.InsertCustomerSegment) {
    const result = await db.insert(schema.customerSegments).values(segment).returning();
    return result[0];
  }

  async updateCustomerSegment(id: string, segment: Partial<schema.InsertCustomerSegment>) {
    const result = await db.update(schema.customerSegments)
      .set({ ...segment, updatedAt: new Date() })
      .where(eq(schema.customerSegments.id, id))
      .returning();
    return result[0];
  }

  async deleteCustomerSegment(id: string) {
    await db.delete(schema.customerSegments).where(eq(schema.customerSegments.id, id));
    return true;
  }

  async calculateSegmentCustomerCount(segmentId: string) {
    const segment = await this.getCustomerSegment(segmentId);
    if (!segment) return 0;

    const customers = await this.getCustomersForSegment(segment.filters);
    const count = customers.length;

    // Update cached count
    await this.updateCustomerSegment(segmentId, {
      customerCount: count,
      lastCalculated: new Date()
    });

    return count;
  }

  async getCustomersForSegment(filters: any) {
    // Build dynamic query based on filters
    const conditions: any[] = [eq(schema.users.role, "customer"), eq(schema.users.isActive, true)];

    if (filters.city) {
      // Note: This would need to join with customer_addresses table for accurate city filtering
      conditions.push(drizzleSql`EXISTS (
        SELECT 1 FROM customer_addresses 
        WHERE customer_addresses.customer_id = ${schema.users.id} 
        AND customer_addresses.city = ${filters.city}
      )`);
    }

    if (filters.branchId) {
      conditions.push(eq(schema.users.branchId, filters.branchId));
    }

    if (filters.loyaltyTier) {
      conditions.push(drizzleSql`EXISTS (
        SELECT 1 FROM loyalty_points 
        WHERE loyalty_points.customer_id = ${schema.users.id} 
        AND loyalty_points.tier = ${filters.loyaltyTier}
      )`);
    }

    if (filters.minOrders) {
      conditions.push(drizzleSql`(
        SELECT COUNT(*) FROM orders 
        WHERE orders.customer_id = ${schema.users.id}
      ) >= ${filters.minOrders}`);
    }

    if (filters.maxOrders) {
      conditions.push(drizzleSql`(
        SELECT COUNT(*) FROM orders 
        WHERE orders.customer_id = ${schema.users.id}
      ) <= ${filters.maxOrders}`);
    }

    if (filters.minTotalSpent) {
      conditions.push(drizzleSql`(
        SELECT COALESCE(SUM(total_amount), 0) FROM orders 
        WHERE orders.customer_id = ${schema.users.id}
      ) >= ${filters.minTotalSpent}`);
    }

    return await db.select().from(schema.users).where(and(...conditions));
  }
}

export const storage = new DbStorage();

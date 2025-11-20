import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import { z } from "zod";
import crypto from "crypto";
import { insertUserSchema, insertOrderSchema, insertBranchSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const existingUsername = await storage.getUserByUsername(userData.username);
      if (existingUsername) {
        return res.status(400).json({ error: "Username already taken" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Create user
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error("Signup error:", error);
      res.status(400).json({ error: error.message || "Signup failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(400).json({ error: error.message || "Login failed" });
    }
  });

  // Forgot password - generate reset token and send email
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists for security
        return res.json({ message: "If the email exists, a reset link has been sent" });
      }

      // Generate secure random token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = await bcrypt.hash(resetToken, 10);

      // Token expires in 60 minutes
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      // Save token to database
      await storage.createPasswordResetToken({
        userId: user.id,
        tokenHash,
        expiresAt,
        usedAt: null,
      });

      // In production, send email with reset link
      // For development only: log the token if explicitly in dev mode
      if (process.env.NODE_ENV === 'development') {
        const resetLink = `http://localhost:5000/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
        console.log('[DEV ONLY] Password Reset Link:', resetLink);
        console.log('[DEV ONLY] Token expires at:', expiresAt);
      }
      
      // TODO: Send email with reset link using email service
      // Example: await emailService.sendPasswordReset(user.email, resetToken);

      res.json({ message: "If the email exists, a reset link has been sent" });
    } catch (error: any) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Failed to process password reset request" });
    }
  });

  // Reset password - verify token and update password
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email, token, newPassword } = req.body;

      if (!email || !token || !newPassword) {
        return res.status(400).json({ error: "Email, token, and new password are required" });
      }

      // Validate password strength
      if (newPassword.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters long" });
      }

      // Find user
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(400).json({ error: "Invalid reset token" });
      }

      // Find all valid tokens for this user (not yet used, not expired)
      const allTokens = await storage.getAllPasswordResetTokensForUser(user.id);
      
      // Filter out expired and used tokens
      const now = new Date();
      const validTokens = allTokens.filter(t => 
        !t.usedAt && new Date(t.expiresAt) > now
      );

      if (validTokens.length === 0) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }
      
      // Find matching token using bcrypt
      let matchingToken = null;
      for (const dbToken of validTokens) {
        const isMatch = await bcrypt.compare(token, dbToken.tokenHash);
        if (isMatch) {
          matchingToken = dbToken;
          break;
        }
      }

      if (!matchingToken) {
        return res.status(400).json({ error: "Invalid reset token" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update user password
      await storage.updateUser(user.id, { password: hashedPassword });

      // Invalidate ALL password reset tokens for this user (security)
      await storage.invalidateUserPasswordResetTokens(user.id);

      res.json({ message: "Password has been reset successfully" });
    } catch (error: any) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // Branch routes
  app.get("/api/branches", async (req, res) => {
    try {
      const branches = await storage.getAllBranches();
      res.json(branches);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/branches", async (req, res) => {
    try {
      const validatedData = insertBranchSchema.parse(req.body);
      const branch = await storage.createBranch(validatedData);
      res.json(branch);
    } catch (error: any) {
      console.error("Branch creation error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/branches/:id", async (req, res) => {
    try {
      const validatedData = insertBranchSchema.partial().parse(req.body);
      const branch = await storage.updateBranch(req.params.id, validatedData);
      if (!branch) {
        return res.status(404).json({ error: "Branch not found" });
      }
      res.json(branch);
    } catch (error: any) {
      console.error("Branch update error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/branches/:id", async (req, res) => {
    try {
      await storage.deleteBranch(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Category routes
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const category = await storage.createCategory(req.body);
      res.json(category);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/categories/:id", async (req, res) => {
    try {
      const category = await storage.updateCategory(req.params.id, req.body);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json(category);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/categories/:id", async (req, res) => {
    try {
      await storage.deleteCategory(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Menu Item routes
  app.get("/api/menu-items", async (req, res) => {
    try {
      const menuItems = await storage.getAllMenuItems();
      res.json(menuItems);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/menu-items", async (req, res) => {
    try {
      const menuItem = await storage.createMenuItem(req.body);
      res.json(menuItem);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/menu-items/:id", async (req, res) => {
    try {
      const menuItem = await storage.updateMenuItem(req.params.id, req.body);
      if (!menuItem) {
        return res.status(404).json({ error: "Menu item not found" });
      }
      res.json(menuItem);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/menu-items/:id", async (req, res) => {
    try {
      await storage.deleteMenuItem(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Order routes
  app.get("/api/orders", async (req, res) => {
    try {
      const { branchId, status } = req.query;
      let orders;
      
      if (branchId) {
        orders = await storage.getOrdersByBranch(branchId as string);
      } else if (status) {
        orders = await storage.getOrdersByStatus(status as string);
      } else {
        orders = await storage.getAllOrders();
      }
      
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      // Validate order data
      const validatedData = insertOrderSchema.parse(req.body);
      
      const order = await storage.createOrder(validatedData);
      res.json(order);
    } catch (error: any) {
      console.error("Order creation error:", error);
      res.status(400).json({ error: error.message || "Failed to create order" });
    }
  });

  app.put("/api/orders/:id", async (req, res) => {
    try {
      const order = await storage.updateOrder(req.params.id, req.body);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      res.json(order);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Endpoint for applying discount (used by Discount Dialog)
  app.post("/api/orders/:id/discount", async (req, res) => {
    try {
      const { discount, discountReason } = req.body;
      
      if (discount === undefined || discount === null) {
        return res.status(400).json({ error: "Discount amount is required" });
      }

      const discountValue = typeof discount === 'string' ? parseFloat(discount) : discount;
      if (isNaN(discountValue) || discountValue < 0) {
        return res.status(400).json({ error: "Invalid discount amount" });
      }

      // Fetch current order
      const currentOrder = await storage.getOrder(req.params.id);
      if (!currentOrder) {
        return res.status(404).json({ error: "Order not found" });
      }

      const subtotal = parseFloat(currentOrder.subtotal);
      if (discountValue > subtotal) {
        return res.status(400).json({ error: "Discount cannot exceed subtotal" });
      }

      // Calculate new total
      const deliveryCharges = parseFloat(currentOrder.deliveryCharges || "0");
      const newTotal = subtotal - discountValue + deliveryCharges;

      // Update order with discount (only pass mutable fields)
      const updatedOrder = await storage.updateOrder(req.params.id, {
        branchId: currentOrder.branchId,
        orderNumber: currentOrder.orderNumber,
        customerId: currentOrder.customerId || undefined,
        sessionId: currentOrder.sessionId || undefined,
        tableId: currentOrder.tableId || undefined,
        customerName: currentOrder.customerName,
        customerPhone: currentOrder.customerPhone,
        alternativePhone: currentOrder.alternativePhone || undefined,
        customerAddress: currentOrder.customerAddress || undefined,
        deliveryArea: currentOrder.deliveryArea || undefined,
        orderType: currentOrder.orderType,
        orderSource: currentOrder.orderSource,
        paymentMethod: currentOrder.paymentMethod,
        paymentStatus: currentOrder.paymentStatus,
        items: currentOrder.items,
        subtotal: currentOrder.subtotal,
        discount: discountValue.toString(),
        discountReason,
        deliveryCharges: currentOrder.deliveryCharges ?? undefined,
        deliveryDistance: currentOrder.deliveryDistance ?? undefined,
        total: newTotal.toString(),
        status: currentOrder.status,
        waiterId: currentOrder.waiterId || undefined,
        servedBy: currentOrder.servedBy || undefined,
        notes: currentOrder.notes || undefined,
      });

      if (!updatedOrder) {
        return res.status(500).json({ error: "Failed to apply discount" });
      }

      res.json(updatedOrder);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Endpoint for processing payment (used by Payment Dialog)
  app.post("/api/orders/:id/payment", async (req, res) => {
    try {
      const { 
        paymentMethod, 
        paymentStatus, 
        paymentDetails,
        jazzCashTransactionId,
        jazzCashPayerPhone,
        jazzCashScreenshotUrl
      } = req.body;
      
      if (!paymentMethod || !paymentStatus) {
        return res.status(400).json({ error: "Payment method and status are required" });
      }

      // Validate JazzCash payment fields if payment method is JazzCash
      if (paymentMethod === "jazzcash" && paymentStatus === "awaiting_verification") {
        if (!jazzCashTransactionId || !jazzCashPayerPhone) {
          return res.status(400).json({ 
            error: "Transaction ID and payer phone are required for JazzCash payments" 
          });
        }
      }

      // Fetch current order
      const currentOrder = await storage.getOrder(req.params.id);
      if (!currentOrder) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Update payment information
      const updatedOrder = await storage.updateOrder(req.params.id, {
        ...currentOrder,
        discount: currentOrder.discount ?? undefined,
        deliveryCharges: currentOrder.deliveryCharges ?? undefined,
        paymentMethod,
        paymentStatus,
        jazzCashTransactionId: jazzCashTransactionId || currentOrder.jazzCashTransactionId || undefined,
        jazzCashPayerPhone: jazzCashPayerPhone || currentOrder.jazzCashPayerPhone || undefined,
        jazzCashScreenshotUrl: jazzCashScreenshotUrl || currentOrder.jazzCashScreenshotUrl || undefined,
        // Store payment details if provided (for split payments, change details, etc.)
        notes: paymentDetails ? `${currentOrder.notes || ""}\nPayment: ${paymentDetails}`.trim() : currentOrder.notes || undefined,
      });

      if (!updatedOrder) {
        return res.status(500).json({ error: "Failed to process payment" });
      }

      res.json(updatedOrder);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Simplified endpoint for updating order status (used by Kitchen Display)
  app.post("/api/orders/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }

      // Validate status value
      const validStatuses = ["pending", "preparing", "ready", "completed", "cancelled"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status value" });
      }

      // Fetch current order
      const currentOrder = await storage.getOrder(req.params.id);
      if (!currentOrder) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Update only the status
      const updatedOrder = await storage.updateOrder(req.params.id, {
        ...currentOrder,
        discount: currentOrder.discount ?? undefined,
        deliveryCharges: currentOrder.deliveryCharges ?? undefined,
        status,
      });

      if (!updatedOrder) {
        return res.status(500).json({ error: "Failed to update order status" });
      }

      res.json(updatedOrder);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // User routes
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Remove passwords from response
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const userData = req.body;
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Create user
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const userData = req.body;
      
      // If password is being updated, hash it
      if (userData.password) {
        userData.password = await bcrypt.hash(userData.password, 10);
      }
      
      const user = await storage.updateUser(req.params.id, userData);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      await storage.deleteUser(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Expense routes
  app.get("/api/expenses", async (req, res) => {
    try {
      const { branchId } = req.query;
      let expenses;
      
      if (branchId) {
        expenses = await storage.getExpensesByBranch(branchId as string);
      } else {
        expenses = await storage.getAllExpenses();
      }
      
      res.json(expenses);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/expenses", async (req, res) => {
    try {
      const expense = await storage.createExpense(req.body);
      res.json(expense);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/expenses/:id", async (req, res) => {
    try {
      const expense = await storage.updateExpense(req.params.id, req.body);
      if (!expense) {
        return res.status(404).json({ error: "Expense not found" });
      }
      res.json(expense);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/expenses/:id", async (req, res) => {
    try {
      await storage.deleteExpense(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // POS Tables routes
  app.get("/api/pos/tables", async (req, res) => {
    try {
      const { branchId } = req.query;
      const tables = branchId
        ? await storage.getPosTablesByBranch(branchId as string)
        : await storage.getAllPosTables();
      res.json(tables);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/pos/tables/:id", async (req, res) => {
    try {
      const table = await storage.getPosTable(req.params.id);
      if (!table) {
        return res.status(404).json({ error: "Table not found" });
      }
      res.json(table);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/pos/tables", async (req, res) => {
    try {
      const table = await storage.createPosTable(req.body);
      res.json(table);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/pos/tables/:id", async (req, res) => {
    try {
      const table = await storage.updatePosTable(req.params.id, req.body);
      if (!table) {
        return res.status(404).json({ error: "Table not found" });
      }
      res.json(table);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/pos/tables/:id", async (req, res) => {
    try {
      await storage.deletePosTable(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // POS Sessions routes
  app.get("/api/pos/sessions", async (req, res) => {
    try {
      const { branchId } = req.query;
      const sessions = branchId
        ? await storage.getPosSessionsByBranch(branchId as string)
        : await storage.getAllPosSessions();
      res.json(sessions);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/pos/sessions/active/:branchId", async (req, res) => {
    try {
      const session = await storage.getActivePosSession(req.params.branchId);
      res.json(session || null);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/pos/sessions/:id", async (req, res) => {
    try {
      const session = await storage.getPosSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(session);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/pos/sessions", async (req, res) => {
    try {
      // Generate session number
      const sessionNumber = `S${Date.now()}`;
      const session = await storage.createPosSession({
        ...req.body,
        sessionNumber,
      });
      res.json(session);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/pos/sessions/:id", async (req, res) => {
    try {
      const session = await storage.updatePosSession(req.params.id, req.body);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(session);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Simplified endpoint for closing a session (used by Session Management)
  app.post("/api/pos/sessions/:id/close", async (req, res) => {
    try {
      const { closingCash, notes } = req.body;
      if (closingCash === undefined || closingCash === null) {
        return res.status(400).json({ error: "closingCash is required" });
      }

      // Validate closingCash is a valid number
      const cashAmount = typeof closingCash === 'string' ? parseFloat(closingCash) : closingCash;
      if (isNaN(cashAmount) || cashAmount < 0) {
        return res.status(400).json({ error: "Invalid closing cash amount" });
      }

      // Fetch current session
      const currentSession = await storage.getPosSession(req.params.id);
      if (!currentSession) {
        return res.status(404).json({ error: "Session not found" });
      }

      if (currentSession.status === "closed") {
        return res.status(400).json({ error: "Session is already closed" });
      }

      // Update session to closed (ensure closingCash is stored as string)
      const updatedSession = await storage.updatePosSession(req.params.id, {
        ...currentSession,
        status: "closed",
        closingCash: cashAmount.toString(),
        notes,
      });

      if (!updatedSession) {
        return res.status(500).json({ error: "Failed to close session" });
      }

      res.json(updatedSession);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Kitchen Tickets routes
  app.get("/api/pos/kitchen-tickets", async (req, res) => {
    try {
      const { status } = req.query;
      const tickets = status
        ? await storage.getKitchenTicketsByStatus(status as string)
        : await storage.getAllKitchenTickets();
      res.json(tickets);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/pos/kitchen-tickets/order/:orderId", async (req, res) => {
    try {
      const tickets = await storage.getKitchenTicketsByOrder(req.params.orderId);
      res.json(tickets);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/pos/kitchen-tickets", async (req, res) => {
    try {
      // Generate ticket number
      const ticketNumber = `KOT${Date.now()}`;
      const ticket = await storage.createKitchenTicket({
        ...req.body,
        ticketNumber,
      });
      res.json(ticket);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/pos/kitchen-tickets/:id", async (req, res) => {
    try {
      const ticket = await storage.updateKitchenTicket(req.params.id, req.body);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }
      res.json(ticket);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Payments routes
  app.get("/api/pos/payments", async (req, res) => {
    try {
      const { orderId, sessionId } = req.query;
      let payments;
      if (orderId) {
        payments = await storage.getPaymentsByOrder(orderId as string);
      } else if (sessionId) {
        payments = await storage.getPaymentsBySession(sessionId as string);
      } else {
        payments = await storage.getAllPayments();
      }
      res.json(payments);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/pos/payments", async (req, res) => {
    try {
      const payment = await storage.createPayment(req.body);
      res.json(payment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Order Modifications routes
  app.get("/api/pos/order-modifications/:orderId", async (req, res) => {
    try {
      const modifications = await storage.getOrderModifications(req.params.orderId);
      res.json(modifications);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/pos/order-modifications", async (req, res) => {
    try {
      const modification = await storage.createOrderModification(req.body);
      res.json(modification);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Table Reservations routes
  app.get("/api/pos/reservations", async (req, res) => {
    try {
      const { tableId } = req.query;
      const reservations = tableId
        ? await storage.getReservationsByTable(tableId as string)
        : await storage.getAllTableReservations();
      res.json(reservations);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/pos/reservations/:id", async (req, res) => {
    try {
      const reservation = await storage.getTableReservation(req.params.id);
      if (!reservation) {
        return res.status(404).json({ error: "Reservation not found" });
      }
      res.json(reservation);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/pos/reservations", async (req, res) => {
    try {
      const reservation = await storage.createTableReservation(req.body);
      res.json(reservation);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/pos/reservations/:id", async (req, res) => {
    try {
      const reservation = await storage.updateTableReservation(req.params.id, req.body);
      if (!reservation) {
        return res.status(404).json({ error: "Reservation not found" });
      }
      res.json(reservation);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/pos/reservations/:id", async (req, res) => {
    try {
      await storage.deleteTableReservation(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import { z } from "zod";
import crypto from "crypto";
import { insertUserSchema, insertOrderSchema, insertBranchSchema, insertRiderSchema, insertDeliverySchema } from "@shared/schema";

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

  // Get bestselling menu items (top 5 by order count)
  app.get("/api/menu-items/bestselling/:branchId", async (req, res) => {
    try {
      const { branchId } = req.params;
      
      // Get all completed orders for the branch
      const orders = await storage.getOrdersByBranch(branchId);
      const completedOrders = orders.filter(o => o.status === "completed" || o.status === "ready");
      
      // Count item occurrences
      const itemCounts = new Map<string, number>();
      
      completedOrders.forEach(order => {
        try {
          const items = JSON.parse(order.items);
          items.forEach((item: any) => {
            const count = itemCounts.get(item.itemId) || 0;
            itemCounts.set(item.itemId, count + (item.quantity || 1));
          });
        } catch (e) {
          console.error("Error parsing order items:", e);
        }
      });
      
      // Get menu items with their counts
      const allMenuItems = await storage.getAllMenuItems();
      const itemsWithCounts = allMenuItems
        .map(item => ({
          ...item,
          orderCount: itemCounts.get(item.id) || 0,
        }))
        .filter(item => item.orderCount > 0 && item.isAvailable)
        .sort((a, b) => b.orderCount - a.orderCount)
        .slice(0, 5);
      
      res.json(itemsWithCounts);
    } catch (error: any) {
      console.error("Error fetching bestselling items:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Comprehensive reports endpoint
  app.get("/api/reports", async (req, res) => {
    try {
      const { startDate, endDate, branchId } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "Start date and end date are required" });
      }

      // Get all orders and expenses
      const allOrders = branchId && branchId !== "all" 
        ? await storage.getOrdersByBranch(branchId as string)
        : await storage.getAllOrders();
      
      const allExpenses = branchId && branchId !== "all"
        ? await storage.getExpensesByBranch(branchId as string)
        : await storage.getAllExpenses();

      // Filter by date range
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999); // Include the entire end date

      const filteredOrders = allOrders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= start && orderDate <= end;
      });

      const filteredExpenses = allExpenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= start && expenseDate <= end;
      });

      // Calculate overview metrics
      const totalOrders = filteredOrders.length;
      const completedOrders = filteredOrders.filter(o => o.status === "completed").length;
      const totalRevenue = filteredOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
      const totalDiscounts = filteredOrders.reduce((sum, order) => sum + (Number(order.discountAmount) || 0), 0);
      const totalDeliveryCharges = filteredOrders
        .filter(o => o.orderType === "delivery")
        .reduce((sum, order) => sum + (Number(order.deliveryFee) || 0), 0);
      const deliveryOrders = filteredOrders.filter(o => o.orderType === "delivery").length;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
      const netRevenue = totalRevenue - totalExpenses;

      // Payment method breakdown
      const paymentBreakdown = filteredOrders.reduce((acc, order) => {
        const method = order.paymentMethod || "cash";
        acc[method] = (acc[method] || 0) + Number(order.totalAmount);
        return acc;
      }, {} as Record<string, number>);

      // Order status distribution
      const orderStatusDistribution = [
        { name: "Pending", value: filteredOrders.filter(o => o.status === "pending").length },
        { name: "Preparing", value: filteredOrders.filter(o => o.status === "preparing").length },
        { name: "Ready", value: filteredOrders.filter(o => o.status === "ready").length },
        { name: "Completed", value: filteredOrders.filter(o => o.status === "completed").length },
        { name: "Cancelled", value: filteredOrders.filter(o => o.status === "cancelled").length },
      ].filter(item => item.value > 0);

      // Sales by order type
      const orderTypeData = {
        "dine-in": { count: 0, revenue: 0 },
        "takeaway": { count: 0, revenue: 0 },
        "delivery": { count: 0, revenue: 0 },
      };

      filteredOrders.forEach(order => {
        const type = order.orderType || "takeaway";
        if (orderTypeData[type as keyof typeof orderTypeData]) {
          orderTypeData[type as keyof typeof orderTypeData].count++;
          orderTypeData[type as keyof typeof orderTypeData].revenue += Number(order.totalAmount);
        }
      });

      const salesByOrderType = Object.entries(orderTypeData).map(([type, data]) => ({
        type,
        revenue: data.revenue,
      }));

      const orderTypeCounts = {
        dinein: orderTypeData["dine-in"].count,
        takeaway: orderTypeData["takeaway"].count,
        delivery: orderTypeData["delivery"].count,
      };

      // Order source counts
      const orderSourceCounts = {
        online: filteredOrders.filter(o => o.orderSource === "online").length,
        pos: filteredOrders.filter(o => o.orderSource === "pos").length,
        phone: filteredOrders.filter(o => o.orderSource === "phone").length,
      };

      // Top selling items
      const itemCounts = new Map<string, { quantity: number; revenue: number; name: string }>();
      
      filteredOrders.forEach(order => {
        if (order.status === "completed" || order.status === "ready") {
          try {
            const items = JSON.parse(order.items);
            items.forEach((item: any) => {
              const existing = itemCounts.get(item.itemId) || { quantity: 0, revenue: 0, name: item.name };
              itemCounts.set(item.itemId, {
                quantity: existing.quantity + (item.quantity || 1),
                revenue: existing.revenue + (item.total || item.price * (item.quantity || 1)),
                name: item.name,
              });
            });
          } catch (e) {
            console.error("Error parsing order items:", e);
          }
        }
      });

      const topSellingProducts = Array.from(itemCounts.entries())
        .map(([id, data]) => ({
          id,
          name: data.name,
          quantity: data.quantity,
          revenue: data.revenue,
        }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);

      // Sales by category
      const categoryRevenue = new Map<string, number>();
      const allMenuItems = await storage.getAllMenuItems();
      
      filteredOrders.forEach(order => {
        try {
          const items = JSON.parse(order.items);
          items.forEach((item: any) => {
            const menuItem = allMenuItems.find(mi => mi.id === item.itemId);
            if (menuItem?.categoryId) {
              const current = categoryRevenue.get(menuItem.categoryId) || 0;
              categoryRevenue.set(menuItem.categoryId, current + (item.total || item.price * (item.quantity || 1)));
            }
          });
        } catch (e) {
          console.error("Error parsing order items for categories:", e);
        }
      });

      const allCategories = await storage.getAllCategories();
      const salesByCategory = Array.from(categoryRevenue.entries())
        .map(([categoryId, revenue]) => {
          const category = allCategories.find(c => c.id === categoryId);
          return {
            name: category?.name || "Unknown",
            value: revenue,
          };
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);

      // Daily sales trends (for charts)
      const dailySalesMap = new Map<string, number>();
      filteredOrders.forEach(order => {
        const dateKey = new Date(order.createdAt).toISOString().split('T')[0];
        dailySalesMap.set(dateKey, (dailySalesMap.get(dateKey) || 0) + Number(order.totalAmount));
      });

      const dailySales = Array.from(dailySalesMap.entries())
        .map(([date, sales]) => ({ date, sales }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Payment method breakdown for charts
      const paymentMethodBreakdown = Object.entries(paymentBreakdown).map(([method, amount]) => ({
        method: method.charAt(0).toUpperCase() + method.slice(1),
        amount,
      }));

      // Response data structure matching the frontend expectations
      res.json({
        overview: {
          totalRevenue,
          totalDiscounts,
          totalOrders,
          completedOrders,
          averageOrderValue,
          totalDeliveryCharges,
          deliveryOrders,
          totalExpenses,
          netRevenue,
        },
        orderStatusDistribution,
        salesByOrderType,
        orderTypeCounts,
        topSellingProducts,
        salesByCategory,
        paymentMethodBreakdown,
        dailySales,
        orderSourceCounts,
      });
    } catch (error: any) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ error: error.message });
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
        deliveryDistance: currentOrder.deliveryDistance || undefined,
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
        deliveryDistance: currentOrder.deliveryDistance || undefined,
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
        deliveryDistance: currentOrder.deliveryDistance || undefined,
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

  // Reports API endpoint
  app.get("/api/reports", async (req, res) => {
    try {
      const { startDate, endDate, branchId } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "Start date and end date are required" });
      }

      // Fetch orders within date range
      let orders;
      if (branchId && branchId !== "all") {
        orders = await storage.getOrdersByBranch(branchId as string);
      } else {
        orders = await storage.getAllOrders();
      }

      // Filter by date range
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      
      const filteredOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= start && orderDate <= end;
      });

      // Get menu items for category mapping
      const menuItems = await storage.getAllMenuItems();
      const categories = await storage.getAllCategories();

      // Calculate overview metrics
      const totalOrders = filteredOrders.length;
      const completedOrders = filteredOrders.filter(o => o.status === "completed").length;
      const totalRevenue = filteredOrders.reduce((sum, o) => sum + parseFloat(o.total), 0);
      const totalDiscounts = filteredOrders.reduce((sum, o) => sum + parseFloat(o.discount || "0"), 0);
      const totalDeliveryCharges = filteredOrders.reduce((sum, o) => sum + parseFloat(o.deliveryCharges || "0"), 0);
      const deliveryOrders = filteredOrders.filter(o => o.orderType === "delivery").length;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Order status distribution
      const statusCounts: Record<string, number> = {};
      filteredOrders.forEach(order => {
        statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
      });
      const orderStatusDistribution = Object.entries(statusCounts).map(([name, value]) => ({
        name,
        value,
      }));

      // Sales by order type
      const salesByType: Record<string, { count: number; revenue: number }> = {};
      filteredOrders.forEach(order => {
        if (!salesByType[order.orderType]) {
          salesByType[order.orderType] = { count: 0, revenue: 0 };
        }
        salesByType[order.orderType].count++;
        salesByType[order.orderType].revenue += parseFloat(order.total);
      });
      const salesByOrderType = Object.entries(salesByType).map(([type, data]) => ({
        type,
        count: data.count,
        revenue: data.revenue,
      }));

      // Order type counts
      const orderTypeCounts: Record<string, number> = {};
      filteredOrders.forEach(order => {
        orderTypeCounts[order.orderType] = (orderTypeCounts[order.orderType] || 0) + 1;
      });

      // Top selling products
      const itemCounts = new Map<string, { name: string; quantity: number; revenue: number }>();
      filteredOrders.forEach(order => {
        try {
          const items = JSON.parse(order.items);
          items.forEach((item: any) => {
            const existing = itemCounts.get(item.itemId);
            if (existing) {
              existing.quantity += item.quantity || 1;
              existing.revenue += (item.price || 0) * (item.quantity || 1);
            } else {
              itemCounts.set(item.itemId, {
                name: item.name || "Unknown",
                quantity: item.quantity || 1,
                revenue: (item.price || 0) * (item.quantity || 1),
              });
            }
          });
        } catch (e) {
          console.error("Error parsing order items:", e);
        }
      });

      const topSellingProducts = Array.from(itemCounts.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);

      // Sales by category
      const categorySales = new Map<string, number>();
      filteredOrders.forEach(order => {
        try {
          const items = JSON.parse(order.items);
          items.forEach((item: any) => {
            const menuItem = menuItems.find(m => m.id === item.itemId);
            if (menuItem) {
              const category = categories.find(c => c.id === menuItem.categoryId);
              const categoryName = category?.name || "Other";
              const revenue = (item.price || 0) * (item.quantity || 1);
              categorySales.set(categoryName, (categorySales.get(categoryName) || 0) + revenue);
            }
          });
        } catch (e) {
          console.error("Error parsing order items:", e);
        }
      });

      const salesByCategory = Array.from(categorySales.entries()).map(([name, revenue]) => ({
        name,
        revenue,
      }));

      // Payment method breakdown
      const paymentMethods = new Map<string, { amount: number; count: number }>();
      filteredOrders.forEach(order => {
        const method = order.paymentMethod;
        const existing = paymentMethods.get(method);
        if (existing) {
          existing.amount += parseFloat(order.total);
          existing.count++;
        } else {
          paymentMethods.set(method, {
            amount: parseFloat(order.total),
            count: 1,
          });
        }
      });

      const paymentMethodBreakdown = Array.from(paymentMethods.entries()).map(([method, data]) => ({
        method,
        amount: data.amount,
        count: data.count,
      }));

      // Daily sales trend
      const dailySalesMap = new Map<string, number>();
      filteredOrders.forEach(order => {
        const date = new Date(order.createdAt).toISOString().split('T')[0];
        dailySalesMap.set(date, (dailySalesMap.get(date) || 0) + parseFloat(order.total));
      });

      const dailySales = Array.from(dailySalesMap.entries())
        .map(([date, revenue]) => ({ date, revenue }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Order source counts
      const orderSourceCounts: Record<string, number> = {};
      filteredOrders.forEach(order => {
        orderSourceCounts[order.orderSource] = (orderSourceCounts[order.orderSource] || 0) + 1;
      });

      res.json({
        overview: {
          totalRevenue,
          totalOrders,
          completedOrders,
          averageOrderValue,
          totalDiscounts,
          totalDeliveryCharges,
          deliveryOrders,
        },
        orderStatusDistribution,
        salesByOrderType,
        orderTypeCounts,
        topSellingProducts,
        salesByCategory,
        paymentMethodBreakdown,
        dailySales,
        orderSourceCounts,
      });
    } catch (error: any) {
      console.error("Error generating reports:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============= Rider Management Routes =============
  
  // Get all riders
  app.get("/api/riders", async (req, res) => {
    try {
      const riders = await storage.getAllRiders();
      res.json(riders);
    } catch (error: any) {
      console.error("Error fetching riders:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get riders by branch
  app.get("/api/riders/branch/:branchId", async (req, res) => {
    try {
      const { branchId } = req.params;
      const riders = await storage.getRidersByBranch(branchId);
      res.json(riders);
    } catch (error: any) {
      console.error("Error fetching riders by branch:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get available riders for assignment
  app.get("/api/riders/available/:branchId", async (req, res) => {
    try {
      const { branchId } = req.params;
      const riders = await storage.getAvailableRiders(branchId);
      res.json(riders);
    } catch (error: any) {
      console.error("Error fetching available riders:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get single rider
  app.get("/api/riders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const rider = await storage.getRider(id);
      if (!rider) {
        return res.status(404).json({ error: "Rider not found" });
      }
      res.json(rider);
    } catch (error: any) {
      console.error("Error fetching rider:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create new rider
  app.post("/api/riders", async (req, res) => {
    try {
      const { password, ...riderData } = req.body;
      const validatedData = insertRiderSchema.parse(riderData);
      
      // Check if phone already exists
      const existingRider = await storage.getRiderByPhone(validatedData.phone);
      if (existingRider) {
        return res.status(400).json({ error: "Phone number already registered" });
      }

      // Create user account for the rider if userId not provided
      let userId = validatedData.userId;
      
      if (!userId && validatedData.email) {
        // Check if email already has a user
        const existingUser = await storage.getUserByEmail(validatedData.email);
        
        if (existingUser) {
          userId = existingUser.id;
        } else {
          // Create new user account
          const defaultPassword = password || "rider123"; // Use provided password or default
          const hashedPassword = await bcrypt.hash(defaultPassword, 10);
          
          const newUser = await storage.createUser({
            username: validatedData.email.split("@")[0] + "_rider",
            email: validatedData.email,
            password: hashedPassword,
            fullName: validatedData.name,
            phone: validatedData.phone,
            role: "rider",
            branchId: validatedData.branchId,
            isActive: true,
          });
          
          userId = newUser.id;
        }
      }

      // Create rider with userId link
      const rider = await storage.createRider({
        ...validatedData,
        userId,
      });
      
      res.status(201).json(rider);
    } catch (error: any) {
      console.error("Error creating rider:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Update rider
  app.patch("/api/riders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const rider = await storage.updateRider(id, req.body);
      if (!rider) {
        return res.status(404).json({ error: "Rider not found" });
      }
      res.json(rider);
    } catch (error: any) {
      console.error("Error updating rider:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update rider GPS location
  app.patch("/api/riders/:id/location", async (req, res) => {
    try {
      const { id } = req.params;
      const { latitude, longitude } = req.body;

      if (!latitude || !longitude) {
        return res.status(400).json({ error: "Latitude and longitude are required" });
      }

      // Update rider location
      const rider = await storage.updateRiderLocation(id, latitude, longitude);
      if (!rider) {
        return res.status(404).json({ error: "Rider not found" });
      }

      // Save location history
      await storage.createRiderLocationHistory({
        riderId: id,
        latitude,
        longitude,
        speed: req.body.speed,
        heading: req.body.heading,
        accuracy: req.body.accuracy,
      });

      res.json(rider);
    } catch (error: any) {
      console.error("Error updating rider location:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete rider
  app.delete("/api/riders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteRider(id);
      if (!success) {
        return res.status(404).json({ error: "Rider not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting rider:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get rider location history
  app.get("/api/riders/:id/location-history", async (req, res) => {
    try {
      const { id } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const history = await storage.getRiderLocationHistory(id, limit);
      res.json(history);
    } catch (error: any) {
      console.error("Error fetching location history:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============= Delivery Assignment Routes =============
  
  // Get all deliveries
  app.get("/api/deliveries", async (req, res) => {
    try {
      const deliveries = await storage.getAllDeliveries();
      res.json(deliveries);
    } catch (error: any) {
      console.error("Error fetching deliveries:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get deliveries by rider
  app.get("/api/deliveries/rider/:riderId", async (req, res) => {
    try {
      const { riderId } = req.params;
      const deliveries = await storage.getDeliveriesByRider(riderId);
      res.json(deliveries);
    } catch (error: any) {
      console.error("Error fetching deliveries by rider:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get active deliveries by rider
  app.get("/api/deliveries/rider/:riderId/active", async (req, res) => {
    try {
      const { riderId } = req.params;
      const deliveries = await storage.getActiveDeliveriesByRider(riderId);
      res.json(deliveries);
    } catch (error: any) {
      console.error("Error fetching active deliveries:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get delivery by order
  app.get("/api/deliveries/order/:orderId", async (req, res) => {
    try {
      const { orderId } = req.params;
      const delivery = await storage.getDeliveryByOrder(orderId);
      if (!delivery) {
        return res.status(404).json({ error: "Delivery not found for this order" });
      }
      res.json(delivery);
    } catch (error: any) {
      console.error("Error fetching delivery by order:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get single delivery
  app.get("/api/deliveries/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const delivery = await storage.getDelivery(id);
      if (!delivery) {
        return res.status(404).json({ error: "Delivery not found" });
      }
      res.json(delivery);
    } catch (error: any) {
      console.error("Error fetching delivery:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Assign delivery to rider
  app.post("/api/deliveries/assign", async (req, res) => {
    try {
      // Get the order to extract branchId
      const order = await storage.getOrder(req.body.orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Add branchId from order to the request data
      const deliveryData = {
        ...req.body,
        branchId: order.branchId,
      };

      const validatedData = insertDeliverySchema.parse(deliveryData);
      
      // Check if order already has a delivery assigned
      const existingDelivery = await storage.getDeliveryByOrder(validatedData.orderId);
      if (existingDelivery) {
        return res.status(400).json({ error: "This order already has a delivery assigned" });
      }

      // Verify rider exists and is available
      const rider = await storage.getRider(validatedData.riderId);
      if (!rider) {
        return res.status(404).json({ error: "Rider not found" });
      }

      if (!rider.isAvailable || !rider.isActive) {
        return res.status(400).json({ error: "Rider is not available for assignment" });
      }

      // Create delivery assignment
      const delivery = await storage.createDelivery(validatedData);

      // Update rider status to busy
      await storage.updateRider(validatedData.riderId, { 
        isAvailable: false,
        status: "busy"
      });

      res.status(201).json(delivery);
    } catch (error: any) {
      console.error("Error assigning delivery:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Update delivery status
  app.patch("/api/deliveries/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }

      const delivery = await storage.getDelivery(id);
      if (!delivery) {
        return res.status(404).json({ error: "Delivery not found" });
      }

      // Update timestamps based on status
      const updates: any = { status };
      const now = new Date();

      switch (status) {
        case "accepted":
          updates.acceptedAt = now;
          break;
        case "picked_up":
          updates.pickedUpAt = now;
          break;
        case "delivered":
          updates.deliveredAt = now;
          // Calculate actual time taken
          if (delivery.assignedAt) {
            const actualTime = Math.floor((now.getTime() - new Date(delivery.assignedAt).getTime()) / 60000);
            updates.actualTime = actualTime;
          }
          // Mark rider as available again
          await storage.updateRider(delivery.riderId, { 
            isAvailable: true,
            status: "online"
          });
          // Increment rider's total deliveries
          const rider = await storage.getRider(delivery.riderId);
          if (rider) {
            await storage.updateRider(delivery.riderId, {
              totalDeliveries: (rider.totalDeliveries || 0) + 1
            });
          }
          break;
        case "cancelled":
          updates.cancelledAt = now;
          updates.cancellationReason = req.body.cancellationReason || "Cancelled by admin";
          // Mark rider as available again
          await storage.updateRider(delivery.riderId, { 
            isAvailable: true,
            status: "online"
          });
          break;
      }

      const updatedDelivery = await storage.updateDelivery(id, updates);
      res.json(updatedDelivery);
    } catch (error: any) {
      console.error("Error updating delivery status:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update delivery
  app.patch("/api/deliveries/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const delivery = await storage.updateDelivery(id, req.body);
      if (!delivery) {
        return res.status(404).json({ error: "Delivery not found" });
      }
      res.json(delivery);
    } catch (error: any) {
      console.error("Error updating delivery:", error);
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

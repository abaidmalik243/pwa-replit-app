import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import crypto from "crypto";
import { insertUserSchema, insertOrderSchema, insertBranchSchema, insertRiderSchema, insertDeliverySchema, DEFAULT_DELIVERY_CONFIG } from "@shared/schema";

// JWT secret - in production, this should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN = "7d"; // Token expires in 7 days

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        username: string;
        fullName: string;
        role: string;
        branchId: string | null;
        permissions: string[];
      };
    }
  }
}

// Helper function to generate JWT token
function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Authentication middleware - validates JWT token from cookie
async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.authToken;
    
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Verify and decode JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    
    if (!decoded.userId) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // Fetch user from database
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Attach user to request (without password, with permissions)
    const { password: _, ...userWithoutPassword } = user;
    req.user = {
      ...userWithoutPassword,
      permissions: user.permissions || [],
    };
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: "Invalid token" });
    }
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: "Token expired" });
    }
    console.error("Authentication error:", error);
    res.status(401).json({ error: "Authentication failed" });
  }
}

// Role-based authorization middleware
function authorize(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    next();
  };
}

// Permission-based authorization middleware
function requirePermission(...requiredPermissions: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Admin users have all permissions by default - bypass permission checks entirely
    if (req.user.role === "admin") {
      return next();
    }

    // Check if user has any of the required permissions
    const hasPermission = requiredPermissions.some(perm => 
      req.user!.permissions.includes(perm)
    );

    if (!hasPermission) {
      return res.status(403).json({ 
        error: "Insufficient permissions",
        required: requiredPermissions,
        userPermissions: req.user.permissions
      });
    }

    next();
  };
}

// Helper function to get effective branch ID for filtering
// For admins: use query param branchId if provided, otherwise return null (all branches)
// For non-admins: always use their assigned branchId regardless of query param
function getEffectiveBranchId(req: Request, queryBranchId?: string): string | null {
  if (req.user?.role === "admin") {
    return queryBranchId || null;
  }
  // Non-admin users always see only their assigned branch
  return req.user?.branchId || null;
}

// Helper to enforce branch-based access for non-admin users
// Returns the effective branchId or throws an error if non-admin user has no branch assigned
function requireBranchAccess(req: Request, queryBranchId?: string): { branchId: string | null; requiresFilter: boolean } {
  if (req.user?.role === "admin") {
    // Admins can access any branch or all branches
    return { branchId: queryBranchId || null, requiresFilter: !!queryBranchId };
  }
  
  // Non-admin users MUST have a branchId assigned
  if (!req.user?.branchId) {
    const error = new Error("Access denied: User has no branch assigned");
    (error as any).statusCode = 403;
    throw error;
  }
  
  // Non-admin users always filtered to their branch
  return { branchId: req.user.branchId, requiresFilter: true };
}

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

      // Generate JWT token
      const token = generateToken(user.id);

      // Set token in httpOnly cookie
      res.cookie('authToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Use HTTPS in production
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
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

      // Generate JWT token
      const token = generateToken(user.id);

      // Set token in httpOnly cookie
      res.cookie('authToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Use HTTPS in production
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(400).json({ error: error.message || "Login failed" });
    }
  });

  // Get current authenticated user
  app.get("/api/auth/me", authenticate, (req, res) => {
    res.json(req.user);
  });

  // Get user preferences
  app.get("/api/user/preferences", authenticate, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({
        language: user.language || 'en',
        currency: user.currency || 'PKR',
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to get preferences" });
    }
  });

  // Update user preferences
  app.patch("/api/user/preferences", authenticate, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { language, currency } = req.body;
      
      // Validate language and currency values
      const validLanguages = ['en', 'ur', 'ar'];
      const validCurrencies = ['PKR', 'USD', 'AED', 'SAR'];
      
      if (language && !validLanguages.includes(language)) {
        return res.status(400).json({ error: "Invalid language" });
      }
      
      if (currency && !validCurrencies.includes(currency)) {
        return res.status(400).json({ error: "Invalid currency" });
      }
      
      // Update user preferences
      const updatedUser = await storage.updateUser(req.user.id, {
        ...(language && { language }),
        ...(currency && { currency }),
      });
      
      res.json({
        language: updatedUser.language,
        currency: updatedUser.currency,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to update preferences" });
    }
  });

  // Logout - clear auth cookie
  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie('authToken');
    res.json({ message: "Logged out successfully" });
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
      const { variantGroupIds, ...menuItemData } = req.body;
      const menuItem = await storage.createMenuItem(menuItemData);
      
      // If variant groups are provided, create the associations
      if (variantGroupIds && Array.isArray(variantGroupIds)) {
        for (const variantGroupId of variantGroupIds) {
          await storage.createMenuItemVariant({
            menuItemId: menuItem.id,
            variantGroupId,
          });
        }
      }
      
      res.json(menuItem);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/menu-items/:id", async (req, res) => {
    try {
      const { variantGroupIds, ...menuItemData } = req.body;
      const menuItem = await storage.updateMenuItem(req.params.id, menuItemData);
      if (!menuItem) {
        return res.status(404).json({ error: "Menu item not found" });
      }
      
      // Only update variant associations if variantGroupIds is explicitly provided
      // This prevents accidental deletion when updating other fields (e.g., availability toggle)
      if (variantGroupIds !== undefined && Array.isArray(variantGroupIds)) {
        // Get existing variant group assignments
        const existingVariants = await storage.getMenuItemVariants(req.params.id);
        const existingGroupIds = existingVariants.map(v => v.variantGroupId);
        
        // Determine which to add and which to remove
        const toAdd = variantGroupIds.filter(id => !existingGroupIds.includes(id));
        const toRemove = existingGroupIds.filter(id => !variantGroupIds.includes(id));
        
        // Remove deselected variant groups
        for (const variantGroupId of toRemove) {
          const variant = existingVariants.find(v => v.variantGroupId === variantGroupId);
          if (variant) {
            await storage.deleteMenuItemVariant(variant.id);
          }
        }
        
        // Add new variant groups
        for (const variantGroupId of toAdd) {
          await storage.createMenuItemVariant({
            menuItemId: req.params.id,
            variantGroupId,
          });
        }
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

  // Get bestselling menu items with configurable timeframe and limit
  app.get("/api/menu-items/bestselling/:branchId", async (req, res) => {
    try {
      const { branchId } = req.params;
      const { days, limit } = req.query;
      
      // Parse and validate query parameters
      const daysParam = days ? parseInt(days as string, 10) : 30;
      const limitParam = limit ? parseInt(limit as string, 10) : 6;
      
      // Validate parameters (enforce sane caps)
      if (daysParam < 1 || daysParam > 365) {
        return res.status(400).json({ error: "Days parameter must be between 1 and 365" });
      }
      if (limitParam < 1 || limitParam > 12) {
        return res.status(400).json({ error: "Limit parameter must be between 1 and 12" });
      }
      
      const itemsWithCounts = await storage.getBestsellingMenuItems(branchId, daysParam, limitParam);
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
        count: filteredOrders.filter(o => (o.paymentMethod || "cash") === method).length,
      }));

      // Expense breakdown by category
      const expenseByCategory = filteredExpenses.reduce((acc, expense) => {
        const category = expense.category || "other";
        acc[category] = (acc[category] || 0) + Number(expense.amount);
        return acc;
      }, {} as Record<string, number>);

      const expenseCategoryBreakdown = Object.entries(expenseByCategory)
        .map(([category, amount]) => ({
          category: category.charAt(0).toUpperCase() + category.slice(1),
          amount,
          count: filteredExpenses.filter(e => (e.category || "other") === category).length,
        }))
        .sort((a, b) => b.amount - a.amount);

      // Daily expense trends
      const dailyExpenseMap = new Map<string, number>();
      filteredExpenses.forEach(expense => {
        const dateKey = new Date(expense.date).toISOString().split('T')[0];
        dailyExpenseMap.set(dateKey, (dailyExpenseMap.get(dateKey) || 0) + Number(expense.amount));
      });

      const dailyExpenses = Array.from(dailyExpenseMap.entries())
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Expense statistics
      const expenseStats = {
        totalExpenses,
        expenseCount: filteredExpenses.length,
        averageExpense: filteredExpenses.length > 0 ? totalExpenses / filteredExpenses.length : 0,
        highestExpense: filteredExpenses.length > 0 ? Math.max(...filteredExpenses.map(e => Number(e.amount))) : 0,
        topCategory: expenseCategoryBreakdown[0]?.category || "N/A",
      };

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
        expenseCategoryBreakdown,
        dailyExpenses,
        expenseStats,
      });
    } catch (error: any) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Order routes
  app.get("/api/orders", authenticate, requirePermission("orders.view"), async (req, res) => {
    try {
      const { branchId, status } = req.query;
      const { branchId: effectiveBranchId, requiresFilter } = requireBranchAccess(req, branchId as string | undefined);
      let orders;
      
      if (requiresFilter && effectiveBranchId) {
        orders = await storage.getOrdersByBranch(effectiveBranchId);
        // Further filter by status if provided
        if (status) {
          orders = orders.filter((order: any) => order.status === status);
        }
      } else if (status) {
        orders = await storage.getOrdersByStatus(status as string);
      } else {
        orders = await storage.getAllOrders();
      }
      
      res.json(orders);
    } catch (error: any) {
      const statusCode = (error as any).statusCode || 500;
      res.status(statusCode).json({ error: error.message });
    }
  });

  app.post("/api/orders", async (req, res) => {
    let createdOrder = null;
    
    try {
      // Validate order data
      const validatedData = insertOrderSchema.parse(req.body);
      
      const order = await storage.createOrder(validatedData);
      createdOrder = order;
      
      // Return order immediately - side effects run asynchronously
      res.json(order);
      
    } catch (error: any) {
      console.error("Order creation error:", error);
      return res.status(400).json({ error: error.message || "Failed to create order" });
    }
    
    // SIDE EFFECTS: Run after response is sent (truly fire-and-forget)
    if (createdOrder) {
      // Wrap everything in Promise.resolve().then() to ensure truly async execution
      Promise.resolve().then(async () => {
        const order = createdOrder!;
        
        // Safely parse items
        let orderItems: any[] = [];
        try {
          if (typeof order.items === "string") {
            orderItems = JSON.parse(order.items);
          } else if (Array.isArray(order.items)) {
            orderItems = order.items;
          }
        } catch (parseError) {
          console.error(`Failed to parse items for order ${order.id}:`, parseError);
          return;
        }
        
        // AUTO-AWARD LOYALTY POINTS
        try {
          if (order.customerId && order.status !== "cancelled") {
            const orderTotal = parseFloat(order.total);
            const pointsEarned = Math.floor(orderTotal / 100);
            
            if (pointsEarned > 0) {
              const loyaltyPoints = await storage.getLoyaltyPoints(order.customerId);
              const currentAvailable = loyaltyPoints?.availablePoints || 0;
              const currentLifetimeEarned = loyaltyPoints?.lifetimeEarned || 0;
              
              await storage.createOrUpdateLoyaltyPoints(order.customerId, {
                availablePoints: currentAvailable + pointsEarned,
                lifetimeEarned: currentLifetimeEarned + pointsEarned
              });
              
              await storage.createLoyaltyTransaction({
                customerId: order.customerId,
                orderId: order.id,
                transactionType: "earn",
                points: pointsEarned,
                balanceAfter: currentAvailable + pointsEarned,
                description: `Earned ${pointsEarned} points from order #${order.orderNumber}`
              });
            }
          }
        } catch (loyaltyError) {
          console.error(`Failed to award loyalty points for order ${order.id}:`, loyaltyError);
        }
        
        // AUTO-DEDUCT STOCK FROM INVENTORY
        try {
          if (Array.isArray(orderItems) && orderItems.length > 0 && order.branchId) {
            for (const item of orderItems) {
              // Support both menuItemId and itemId field names
              const menuItemId = item.menuItemId || item.itemId;
              const quantity = item.quantity;
              
              if (!menuItemId || typeof quantity !== "number" || quantity <= 0) {
                console.warn(`Skipping stock deduction for invalid item in order ${order.id}:`, item);
                continue;
              }
              
              try {
                await storage.createInventoryTransaction({
                  branchId: order.branchId,
                  menuItemId: menuItemId,
                  transactionType: "sale",
                  quantity: -quantity,
                  performedBy: order.createdBy || "system",
                  notes: `Stock deducted for order #${order.orderNumber}`
                });
              } catch (inventoryError) {
                console.error(`Failed to deduct stock for item ${menuItemId} in order ${order.id}:`, inventoryError);
              }
            }
          }
        } catch (stockError) {
          console.error(`Failed to process stock deductions for order ${order.id}:`, stockError);
        }
      }).catch((err) => {
        // Catch any unhandled errors in the side effects chain
        console.error(`Unhandled error in order side effects for order ${createdOrder?.id}:`, err);
      });
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

  // User routes - with branch-based access control
  app.get("/api/users", authenticate, async (req, res) => {
    try {
      const { branchId, role, isActive } = req.query;
      const user = (req as any).user;
      const isAdmin = user?.role === "admin";
      
      let users = await storage.getAllUsers();
      
      // Non-admin users can only see users from their own branch
      if (!isAdmin) {
        const userBranchId = user?.branchId;
        if (!userBranchId) {
          return res.status(403).json({ error: "No branch assigned" });
        }
        // Force filter to user's branch, ignoring any branchId query param
        users = users.filter(u => u.branchId === userBranchId);
      } else {
        // Admin can filter by branchId if provided
        if (branchId && typeof branchId === 'string') {
          users = users.filter(u => u.branchId === branchId);
        }
      }
      
      // Filter by role if provided
      if (role && typeof role === 'string') {
        users = users.filter(u => u.role === role);
      }
      
      // Filter by isActive if provided (for staff dropdown in expense form)
      if (isActive === 'true') {
        users = users.filter(u => u.isActive !== false);
      }
      
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

  // Expense routes - returns daily expenses (5 AM today to 4:59 AM tomorrow)
  app.get("/api/expenses", authenticate, requirePermission("expenses.view"), async (req, res) => {
    try {
      const { branchId } = req.query;
      const { branchId: effectiveBranchId, requiresFilter } = requireBranchAccess(req, branchId as string | undefined);
      
      // Use getDailyExpenses to filter to 24-hour window (5 AM - 4:59 AM)
      const expenses = await storage.getDailyExpenses(
        requiresFilter && effectiveBranchId ? effectiveBranchId : (branchId as string | undefined)
      );
      
      res.json(expenses);
    } catch (error: any) {
      const statusCode = (error as any).statusCode || 500;
      res.status(statusCode).json({ error: error.message });
    }
  });

  app.post("/api/expenses", authenticate, requirePermission("expenses.create"), async (req, res) => {
    try {
      // Parse the date string to a Date object if it's a string
      const expenseData = {
        ...req.body,
        date: typeof req.body.date === 'string' ? new Date(req.body.date) : req.body.date,
      };
      const expense = await storage.createExpense(expenseData);
      res.json(expense);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/expenses/:id", authenticate, requirePermission("expenses.edit"), async (req, res) => {
    try {
      // Parse the date string to a Date object if it's a string
      const updateData = {
        ...req.body,
        date: typeof req.body.date === 'string' ? new Date(req.body.date) : req.body.date,
      };
      const expense = await storage.updateExpense(req.params.id, updateData);
      if (!expense) {
        return res.status(404).json({ error: "Expense not found" });
      }
      res.json(expense);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/expenses/:id", authenticate, requirePermission("expenses.delete"), async (req, res) => {
    try {
      await storage.deleteExpense(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // POS Tables routes
  app.get("/api/pos/tables", authenticate, async (req, res) => {
    try {
      const { branchId } = req.query;
      const { branchId: effectiveBranchId, requiresFilter } = requireBranchAccess(req, branchId as string | undefined);
      const tables = requiresFilter && effectiveBranchId
        ? await storage.getPosTablesByBranch(effectiveBranchId)
        : await storage.getAllPosTables();
      res.json(tables);
    } catch (error: any) {
      const statusCode = (error as any).statusCode || 400;
      res.status(statusCode).json({ error: error.message });
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
  app.get("/api/pos/sessions", authenticate, async (req, res) => {
    try {
      const { branchId } = req.query;
      const { branchId: effectiveBranchId, requiresFilter } = requireBranchAccess(req, branchId as string | undefined);
      const sessions = requiresFilter && effectiveBranchId
        ? await storage.getPosSessionsByBranch(effectiveBranchId)
        : await storage.getAllPosSessions();
      res.json(sessions);
    } catch (error: any) {
      const statusCode = (error as any).statusCode || 400;
      res.status(statusCode).json({ error: error.message });
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
  
  // Get all riders (admin/staff only)
  app.get("/api/riders", authenticate, authorize("admin", "staff"), async (req, res) => {
    try {
      const { branchId } = req.query;
      const { branchId: effectiveBranchId, requiresFilter } = requireBranchAccess(req, branchId as string | undefined);
      const riders = requiresFilter && effectiveBranchId
        ? await storage.getRidersByBranch(effectiveBranchId)
        : await storage.getAllRiders();
      res.json(riders);
    } catch (error: any) {
      console.error("Error fetching riders:", error);
      const statusCode = (error as any).statusCode || 500;
      res.status(statusCode).json({ error: error.message });
    }
  });

  // Get riders by branch (admin/staff only)
  app.get("/api/riders/branch/:branchId", authenticate, authorize("admin", "staff"), async (req, res) => {
    try {
      const { branchId } = req.params;
      const riders = await storage.getRidersByBranch(branchId);
      res.json(riders);
    } catch (error: any) {
      console.error("Error fetching riders by branch:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get current authenticated rider's data
  app.get("/api/riders/me", authenticate, authorize("rider"), async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const rider = await storage.getRiderByUserId(req.user.id);
      if (!rider) {
        return res.status(404).json({ error: "Rider profile not found" });
      }

      res.json(rider);
    } catch (error: any) {
      console.error("Error fetching current rider:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get available riders for assignment (admin/staff only)
  app.get("/api/riders/available/:branchId", authenticate, authorize("admin", "staff"), async (req, res) => {
    try {
      const { branchId } = req.params;
      const riders = await storage.getAvailableRiders(branchId);
      res.json(riders);
    } catch (error: any) {
      console.error("Error fetching available riders:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get single rider (admin/staff or rider viewing their own profile)
  app.get("/api/riders/:id", authenticate, async (req, res) => {
    try {
      const { id } = req.params;
      const rider = await storage.getRider(id);
      if (!rider) {
        return res.status(404).json({ error: "Rider not found" });
      }

      // Check authorization: admin/staff can view any rider, riders can only view their own profile
      if (req.user!.role !== "admin" && req.user!.role !== "staff") {
        if (rider.userId !== req.user!.id) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }
      }

      res.json(rider);
    } catch (error: any) {
      console.error("Error fetching rider:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create new rider (admin/staff only)
  app.post("/api/riders", authenticate, authorize("admin", "staff"), async (req, res) => {
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

  // Update rider (admin/staff or rider updating their own profile)
  app.patch("/api/riders/:id", authenticate, async (req, res) => {
    try {
      const { id } = req.params;
      const existingRider = await storage.getRider(id);
      if (!existingRider) {
        return res.status(404).json({ error: "Rider not found" });
      }

      // Check authorization: admin/staff can update any rider, riders can only update their own profile
      if (req.user!.role !== "admin" && req.user!.role !== "staff") {
        if (existingRider.userId !== req.user!.id) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }
      }

      const rider = await storage.updateRider(id, req.body);
      res.json(rider);
    } catch (error: any) {
      console.error("Error updating rider:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update rider GPS location (authenticated rider only - can only update their own location)
  app.patch("/api/riders/:id/location", authenticate, async (req, res) => {
    try {
      const { id } = req.params;
      const { latitude, longitude } = req.body;

      if (!latitude || !longitude) {
        return res.status(400).json({ error: "Latitude and longitude are required" });
      }

      const existingRider = await storage.getRider(id);
      if (!existingRider) {
        return res.status(404).json({ error: "Rider not found" });
      }

      // Check authorization: admin/staff can update any location, riders can only update their own
      if (req.user!.role !== "admin" && req.user!.role !== "staff") {
        if (existingRider.userId !== req.user!.id) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }
      }

      // Update rider location
      const rider = await storage.updateRiderLocation(id, latitude, longitude);

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

  // Delete rider (admin only)
  app.delete("/api/riders/:id", authenticate, authorize("admin"), async (req, res) => {
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
  
  // Get all deliveries (admin/staff only)
  app.get("/api/deliveries", authenticate, authorize("admin", "staff"), async (req, res) => {
    try {
      const { branchId } = req.query;
      const { branchId: effectiveBranchId, requiresFilter } = requireBranchAccess(req, branchId as string | undefined);
      const deliveries = requiresFilter && effectiveBranchId
        ? await storage.getDeliveriesByBranch(effectiveBranchId)
        : await storage.getAllDeliveries();
      res.json(deliveries);
    } catch (error: any) {
      console.error("Error fetching deliveries:", error);
      const statusCode = (error as any).statusCode || 500;
      res.status(statusCode).json({ error: error.message });
    }
  });

  // Get deliveries by rider (authenticated users - riders can only see their own)
  app.get("/api/deliveries/rider/:riderId", authenticate, async (req, res) => {
    try {
      const { riderId } = req.params;
      const deliveries = await storage.getDeliveriesByRider(riderId);
      res.json(deliveries);
    } catch (error: any) {
      console.error("Error fetching deliveries by rider:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get active deliveries by rider (authenticated users - riders can only see their own)
  app.get("/api/deliveries/rider/:riderId/active", authenticate, async (req, res) => {
    try {
      const { riderId } = req.params;
      const deliveries = await storage.getActiveDeliveriesByRider(riderId);
      res.json(deliveries);
    } catch (error: any) {
      console.error("Error fetching active deliveries:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get delivery by order (admin/staff only)
  app.get("/api/deliveries/order/:orderId", authenticate, authorize("admin", "staff"), async (req, res) => {
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

  // Get single delivery (authenticated users)
  app.get("/api/deliveries/:id", authenticate, async (req, res) => {
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

  // Assign delivery to rider (admin/staff only)
  app.post("/api/deliveries/assign", authenticate, authorize("admin", "staff"), async (req, res) => {
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

  // Update delivery status (authenticated users - riders can update their assigned deliveries)
  app.patch("/api/deliveries/:id/status", authenticate, async (req, res) => {
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

  // Update delivery (admin/staff only)
  app.patch("/api/deliveries/:id", authenticate, authorize("admin", "staff"), async (req, res) => {
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

  // Promo Codes Management

  // Get all promo codes (admin/staff only)
  app.get("/api/promo-codes", authenticate, authorize("admin", "staff"), async (req, res) => {
    try {
      const promoCodes = await storage.getAllPromoCodes();
      res.json(promoCodes);
    } catch (error: any) {
      console.error("Error fetching promo codes:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get promo code by ID (admin/staff only)
  app.get("/api/promo-codes/:id", authenticate, authorize("admin", "staff"), async (req, res) => {
    try {
      const { id } = req.params;
      const promoCode = await storage.getPromoCode(id);
      if (!promoCode) {
        return res.status(404).json({ error: "Promo code not found" });
      }
      res.json(promoCode);
    } catch (error: any) {
      console.error("Error fetching promo code:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Validate and apply promo code (authenticated users)
  app.post("/api/promo-codes/validate", authenticate, async (req, res) => {
    try {
      const { code, orderAmount, branchId } = req.body;

      if (!code || !orderAmount) {
        return res.status(400).json({ error: "Code and order amount are required" });
      }

      if (!branchId) {
        return res.status(400).json({ error: "Branch ID is required" });
      }

      // Use authenticated user's ID from session
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Get promo code
      const promoCode = await storage.getPromoCodeByCode(code.toUpperCase());
      if (!promoCode) {
        return res.status(404).json({ error: "Invalid promo code" });
      }

      // Check if promo code is active
      if (!promoCode.isActive) {
        return res.status(400).json({ error: "Promo code is not active" });
      }

      // Check if promo code is expired
      const now = new Date();
      if (promoCode.validUntil && new Date(promoCode.validUntil) < now) {
        return res.status(400).json({ error: "Promo code has expired" });
      }

      // Check if promo code is valid yet
      if (new Date(promoCode.validFrom) > now) {
        return res.status(400).json({ error: "Promo code is not valid yet" });
      }

      // Check if usage limit is reached
      if (promoCode.usageLimit && promoCode.usageCount >= promoCode.usageLimit) {
        return res.status(400).json({ error: "Promo code usage limit reached" });
      }

      // Check per-user usage limit (always check when perUserLimit is set)
      if (promoCode.perUserLimit) {
        const userUsageCount = await storage.getUserPromoCodeUsageCount(promoCode.id, userId);
        if (userUsageCount >= promoCode.perUserLimit) {
          return res.status(400).json({ error: "You have reached the usage limit for this promo code" });
        }
      }

      // Check branch restriction (always enforce if promo code has a branch restriction)
      if (promoCode.branchId && promoCode.branchId !== branchId) {
        return res.status(400).json({ error: "Promo code is not valid for this branch" });
      }

      // Check minimum order amount
      if (parseFloat(promoCode.minOrderAmount || "0") > orderAmount) {
        return res.status(400).json({ 
          error: `Minimum order amount of ₨${promoCode.minOrderAmount} required` 
        });
      }

      // Calculate discount
      let discountAmount = 0;
      if (promoCode.discountType === "percentage") {
        discountAmount = (orderAmount * parseFloat(promoCode.discountValue)) / 100;
        // Apply max discount cap if set
        if (promoCode.maxDiscountAmount) {
          discountAmount = Math.min(discountAmount, parseFloat(promoCode.maxDiscountAmount));
        }
      } else {
        discountAmount = parseFloat(promoCode.discountValue);
      }

      // Ensure discount doesn't exceed order amount
      discountAmount = Math.min(discountAmount, orderAmount);

      res.json({
        valid: true,
        promoCode: promoCode,
        discountAmount: discountAmount.toFixed(2),
        finalAmount: (orderAmount - discountAmount).toFixed(2),
      });
    } catch (error: any) {
      console.error("Error validating promo code:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create promo code (admin only)
  app.post("/api/promo-codes", authenticate, authorize("admin"), async (req, res) => {
    try {
      // Ensure code is uppercase
      const promoData = {
        ...req.body,
        code: req.body.code.toUpperCase(),
        createdBy: req.user?.id,
      };

      // Check if code already exists
      const existing = await storage.getPromoCodeByCode(promoData.code);
      if (existing) {
        return res.status(400).json({ error: "Promo code already exists" });
      }

      const promoCode = await storage.createPromoCode(promoData);
      res.status(201).json(promoCode);
    } catch (error: any) {
      console.error("Error creating promo code:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update promo code (admin only)
  app.patch("/api/promo-codes/:id", authenticate, authorize("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      
      // Ensure code is uppercase if provided
      const updateData = req.body.code 
        ? { ...req.body, code: req.body.code.toUpperCase() }
        : req.body;

      const promoCode = await storage.updatePromoCode(id, updateData);
      if (!promoCode) {
        return res.status(404).json({ error: "Promo code not found" });
      }
      res.json(promoCode);
    } catch (error: any) {
      console.error("Error updating promo code:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete promo code (admin only)
  app.delete("/api/promo-codes/:id", authenticate, authorize("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deletePromoCode(id);
      if (!deleted) {
        return res.status(404).json({ error: "Promo code not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting promo code:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get promo code usage history (admin/staff only)
  app.get("/api/promo-codes/:id/usage", authenticate, authorize("admin", "staff"), async (req, res) => {
    try {
      const { id } = req.params;
      const usage = await storage.getPromoCodeUsage(id);
      res.json(usage);
    } catch (error: any) {
      console.error("Error fetching promo code usage:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== Delivery Charges Configuration Routes ====================

  // Get all delivery charges configurations (admin/staff only)
  app.get("/api/delivery-charges", authenticate, authorize("admin", "staff"), async (req, res) => {
    try {
      const configs = await storage.getAllDeliveryChargesConfigs();
      res.json(configs);
    } catch (error: any) {
      console.error("Error fetching delivery charges configs:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get delivery charges config for a specific branch
  app.get("/api/delivery-charges/:branchId", async (req, res) => {
    try {
      const { branchId } = req.params;
      const config = await storage.getDeliveryChargesConfig(branchId);
      res.json(config || null);
    } catch (error: any) {
      console.error("Error fetching delivery charges config:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Calculate delivery charges based on config and distance
  app.post("/api/delivery-charges/calculate", authenticate, async (req, res) => {
    try {
      const { branchId, orderAmount, distance: providedDistance, deliveryAddress } = req.body;

      if (!branchId || !orderAmount) {
        return res.status(400).json({ error: "Branch ID and order amount are required" });
      }

      // Get branch-specific config or use defaults
      const config = await storage.getDeliveryChargesConfig(branchId);
      
      // Use config only if it exists and is active, otherwise use defaults
      const useConfig = config && config.isActive;
      const chargeType = useConfig ? config.chargeType : DEFAULT_DELIVERY_CONFIG.CHARGE_TYPE;
      const freeDeliveryThreshold = parseFloat(
        useConfig ? (config.freeDeliveryThreshold || DEFAULT_DELIVERY_CONFIG.FREE_DELIVERY_THRESHOLD.toString()) 
                  : DEFAULT_DELIVERY_CONFIG.FREE_DELIVERY_THRESHOLD.toString()
      );

      // Delivery time estimation constants
      const BASE_PREP_TIME = 25; // minutes for food preparation
      const TRAVEL_TIME_PER_KM = 2.5; // minutes per kilometer

      // Initialize distance (will be calculated later if needed)
      let deliveryCharges = 0;
      let calculatedDistance = providedDistance;
      
      // Validate and sanitize distance for time estimation
      const safeDistance = typeof calculatedDistance === "number" 
        && !isNaN(calculatedDistance) 
        && calculatedDistance > 0
          ? calculatedDistance
          : 5; // Default to 5km if invalid

      // Check for free delivery
      if (orderAmount >= freeDeliveryThreshold) {
        // Calculate estimated delivery time using safe distance
        const estimatedTime = Math.ceil(BASE_PREP_TIME + (safeDistance * TRAVEL_TIME_PER_KM));
        
        return res.json({
          deliveryCharges: 0,
          chargeType: chargeType,
          freeDelivery: true,
          message: `Free delivery for orders above ₨${freeDeliveryThreshold}`,
          usingCustomConfig: useConfig,
          estimatedDeliveryTime: estimatedTime,
        });
      }

      if (chargeType === "static") {
        // Static pricing
        const staticCharge = parseFloat(
          useConfig ? (config.staticCharge || DEFAULT_DELIVERY_CONFIG.STATIC_CHARGE.toString())
                    : DEFAULT_DELIVERY_CONFIG.STATIC_CHARGE.toString()
        );
        deliveryCharges = staticCharge;
      } else {
        // Dynamic pricing based on distance
        // If delivery address provided, calculate distance from branch
        if (deliveryAddress && !providedDistance) {
          const { geocodeAddress, calculateDistance, validateAddress } = await import("./geocoding");
          
          // Validate address length to prevent abuse
          const validation = validateAddress(deliveryAddress);
          if (!validation.valid) {
            console.warn('Address validation failed:', validation.error);
            // Fall back to default static charge instead of failing
            const defaultStaticCharge = parseFloat(DEFAULT_DELIVERY_CONFIG.STATIC_CHARGE.toString());
            const defaultEstimatedTime = Math.ceil(BASE_PREP_TIME + (5 * TRAVEL_TIME_PER_KM));
            return res.json({
              deliveryCharges: defaultStaticCharge,
              chargeType: "static",
              freeDelivery: false,
              distance: null,
              usingCustomConfig: false,
              message: "Using default delivery charge (invalid address)",
              estimatedDeliveryTime: defaultEstimatedTime,
            });
          }

          // Get branch coordinates
          const branch = await storage.getBranch(branchId);
          if (!branch || !branch.latitude || !branch.longitude) {
            console.warn('Branch coordinates not available for branch:', branchId);
            // Fall back to default static charge instead of 500 error
            const defaultStaticCharge = parseFloat(DEFAULT_DELIVERY_CONFIG.STATIC_CHARGE.toString());
            const defaultEstimatedTime = Math.ceil(BASE_PREP_TIME + (5 * TRAVEL_TIME_PER_KM));
            return res.json({
              deliveryCharges: defaultStaticCharge,
              chargeType: "static",
              freeDelivery: false,
              distance: null,
              usingCustomConfig: false,
              message: "Using default delivery charge (branch coordinates unavailable)",
              estimatedDeliveryTime: defaultEstimatedTime,
            });
          }

          // Geocode delivery address
          const geocoded = await geocodeAddress(deliveryAddress);
          if (!geocoded) {
            console.warn('Geocoding failed for address:', deliveryAddress.substring(0, 30));
            // Fall back to default static charge instead of failing
            const defaultStaticCharge = parseFloat(DEFAULT_DELIVERY_CONFIG.STATIC_CHARGE.toString());
            const defaultEstimatedTime = Math.ceil(BASE_PREP_TIME + (5 * TRAVEL_TIME_PER_KM));
            return res.json({
              deliveryCharges: defaultStaticCharge,
              chargeType: "static",
              freeDelivery: false,
              distance: null,
              usingCustomConfig: false,
              message: "Using default delivery charge (address not found)",
              estimatedDeliveryTime: defaultEstimatedTime,
            });
          }

          // Calculate distance
          calculatedDistance = calculateDistance(
            parseFloat(branch.latitude),
            parseFloat(branch.longitude),
            geocoded.latitude,
            geocoded.longitude
          );
        }

        // If still no distance after attempting geocoding, use default charge
        if (!calculatedDistance) {
          const defaultStaticCharge = parseFloat(DEFAULT_DELIVERY_CONFIG.STATIC_CHARGE.toString());
          const defaultEstimatedTime = Math.ceil(BASE_PREP_TIME + (5 * TRAVEL_TIME_PER_KM));
          return res.json({
            deliveryCharges: defaultStaticCharge,
            chargeType: "static",
            freeDelivery: false,
            distance: null,
            usingCustomConfig: false,
            message: "Using default delivery charge",
            estimatedDeliveryTime: defaultEstimatedTime,
          });
        }

        const baseCharge = parseFloat(
          useConfig ? (config.baseCharge || DEFAULT_DELIVERY_CONFIG.BASE_CHARGE.toString())
                    : DEFAULT_DELIVERY_CONFIG.BASE_CHARGE.toString()
        );
        const perKmCharge = parseFloat(
          useConfig ? (config.perKmCharge || DEFAULT_DELIVERY_CONFIG.PER_KM_CHARGE.toString())
                    : DEFAULT_DELIVERY_CONFIG.PER_KM_CHARGE.toString()
        );
        const maxDistance = parseFloat(
          useConfig ? (config.maxDeliveryDistance || DEFAULT_DELIVERY_CONFIG.MAX_DELIVERY_DISTANCE.toString())
                    : DEFAULT_DELIVERY_CONFIG.MAX_DELIVERY_DISTANCE.toString()
        );

        // Validate distance is a number
        const validDistance = typeof calculatedDistance === "number" && !isNaN(calculatedDistance) && calculatedDistance > 0;
        
        if (validDistance && calculatedDistance > maxDistance) {
          const maxDistanceTime = Math.ceil(BASE_PREP_TIME + (maxDistance * TRAVEL_TIME_PER_KM));
          return res.status(400).json({ 
            error: `Delivery not available for distances over ${maxDistance} KM`,
            maxDistance: maxDistance,
            providedDistance: calculatedDistance,
            estimatedDeliveryTime: maxDistanceTime
          });
        }

        deliveryCharges = baseCharge + (validDistance ? calculatedDistance * perKmCharge : 0);
      }

      // Calculate estimated delivery time using safe distance (already validated at start)
      const estimatedTime = Math.ceil(BASE_PREP_TIME + (safeDistance * TRAVEL_TIME_PER_KM));

      res.json({
        deliveryCharges: parseFloat(deliveryCharges.toFixed(2)),
        chargeType: chargeType,
        freeDelivery: false,
        distance: calculatedDistance || null,
        usingCustomConfig: useConfig,
        estimatedDeliveryTime: estimatedTime,
      });
    } catch (error: any) {
      console.error("Error calculating delivery charges:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create or update delivery charges config (admin only)
  app.post("/api/delivery-charges/:branchId", authenticate, authorize("admin"), async (req, res) => {
    try {
      const { branchId } = req.params;
      const configData = { ...req.body, branchId };

      // Check if config already exists
      const existing = await storage.getDeliveryChargesConfig(branchId);
      
      let config;
      if (existing) {
        config = await storage.updateDeliveryChargesConfig(branchId, configData);
      } else {
        config = await storage.createDeliveryChargesConfig(configData);
      }

      res.json(config);
    } catch (error: any) {
      console.error("Error saving delivery charges config:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete delivery charges config (admin only)
  app.delete("/api/delivery-charges/:branchId", authenticate, authorize("admin"), async (req, res) => {
    try {
      const { branchId } = req.params;
      const deleted = await storage.deleteDeliveryChargesConfig(branchId);
      if (!deleted) {
        return res.status(404).json({ error: "Delivery charges config not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting delivery charges config:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== Variant Management Routes ====================

  // Get all variant groups
  app.get("/api/variant-groups", async (req, res) => {
    try {
      const groups = await storage.getAllVariantGroups();
      res.json(groups);
    } catch (error: any) {
      console.error("Error fetching variant groups:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get single variant group
  app.get("/api/variant-groups/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const group = await storage.getVariantGroup(id);
      if (!group) {
        return res.status(404).json({ error: "Variant group not found" });
      }
      res.json(group);
    } catch (error: any) {
      console.error("Error fetching variant group:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create variant group (admin/staff only)
  app.post("/api/variant-groups", authenticate, authorize("admin", "staff"), async (req, res) => {
    try {
      const group = await storage.createVariantGroup(req.body);
      res.json(group);
    } catch (error: any) {
      console.error("Error creating variant group:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update variant group (admin/staff only)
  app.patch("/api/variant-groups/:id", authenticate, authorize("admin", "staff"), async (req, res) => {
    try {
      const { id } = req.params;
      const group = await storage.updateVariantGroup(id, req.body);
      if (!group) {
        return res.status(404).json({ error: "Variant group not found" });
      }
      res.json(group);
    } catch (error: any) {
      console.error("Error updating variant group:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete variant group (admin only)
  app.delete("/api/variant-groups/:id", authenticate, authorize("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteVariantGroup(id);
      if (!deleted) {
        return res.status(404).json({ error: "Variant group not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting variant group:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get all variant options
  app.get("/api/variant-options", async (req, res) => {
    try {
      const { groupId } = req.query;
      let options;
      if (groupId && typeof groupId === 'string') {
        options = await storage.getVariantOptionsByGroup(groupId);
      } else {
        options = await storage.getAllVariantOptions();
      }
      res.json(options);
    } catch (error: any) {
      console.error("Error fetching variant options:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create variant option (admin/staff only)
  app.post("/api/variant-options", authenticate, authorize("admin", "staff"), async (req, res) => {
    try {
      const option = await storage.createVariantOption(req.body);
      res.json(option);
    } catch (error: any) {
      console.error("Error creating variant option:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update variant option (admin/staff only)
  app.patch("/api/variant-options/:id", authenticate, authorize("admin", "staff"), async (req, res) => {
    try {
      const { id } = req.params;
      const option = await storage.updateVariantOption(id, req.body);
      if (!option) {
        return res.status(404).json({ error: "Variant option not found" });
      }
      res.json(option);
    } catch (error: any) {
      console.error("Error updating variant option:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete variant option (admin only)
  app.delete("/api/variant-options/:id", authenticate, authorize("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteVariantOption(id);
      if (!deleted) {
        return res.status(404).json({ error: "Variant option not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting variant option:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get menu item variants (variant groups assigned to a menu item)
  app.get("/api/menu-items/:menuItemId/variants", async (req, res) => {
    try {
      const { menuItemId } = req.params;
      const variants = await storage.getMenuItemVariants(menuItemId);
      res.json(variants);
    } catch (error: any) {
      console.error("Error fetching menu item variants:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Assign variant group to menu item (admin/staff only)
  app.post("/api/menu-items/:menuItemId/variants", authenticate, authorize("admin", "staff"), async (req, res) => {
    try {
      const { menuItemId } = req.params;
      const { variantGroupId } = req.body;
      
      const menuItemVariant = await storage.createMenuItemVariant({
        menuItemId,
        variantGroupId,
      });
      
      res.json(menuItemVariant);
    } catch (error: any) {
      console.error("Error assigning variant to menu item:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Remove variant group from menu item (admin only)
  app.delete("/api/menu-items/:menuItemId/variants/:id", authenticate, authorize("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteMenuItemVariant(id);
      if (!deleted) {
        return res.status(404).json({ error: "Menu item variant assignment not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error removing variant from menu item:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get complete variant group data (groups + options) for a menu item
  app.get("/api/menu-items/:menuItemId/variant-groups", async (req, res) => {
    try {
      const { menuItemId } = req.params;
      
      // Get variant group assignments for this menu item
      const menuItemVariants = await storage.getMenuItemVariants(menuItemId);
      
      // Get complete data for each variant group including options
      const variantGroupsWithOptions = await Promise.all(
        menuItemVariants.map(async (assignment) => {
          const group = await storage.getVariantGroup(assignment.variantGroupId);
          if (!group) return null;
          
          const options = await storage.getVariantOptionsByGroup(assignment.variantGroupId);
          
          return {
            id: group.id,
            name: group.name,
            description: group.description,
            selectionType: group.selectionType,
            required: group.isRequired, // Rename to 'required' for consistency with ItemCustomizationDialog
            displayOrder: group.displayOrder,
            options: options.map(opt => ({
              id: opt.id,
              name: opt.name,
              shortName: opt.shortName,
              price: parseFloat(opt.priceModifier || "0"), // Rename to 'price' for consistency with ItemCustomizationDialog
              isDefault: opt.isDefault,
              displayOrder: opt.displayOrder,
            })).filter(opt => opt).sort((a, b) => a.displayOrder - b.displayOrder),
          };
        })
      );
      
      // Filter out null groups and sort by display order
      const validGroups = variantGroupsWithOptions
        .filter(g => g !== null)
        .sort((a, b) => a!.displayOrder - b!.displayOrder);
      
      res.json(validGroups);
    } catch (error: any) {
      console.error("Error fetching menu item variant groups:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== Saved Customers Management ====================
  
  // Get all customers with aggregated data
  app.get("/api/admin/customers", authenticate, requirePermission("loyalty.view_customers"), async (req, res) => {
    try {
      const { search, tier, sortBy, sortOrder } = req.query;
      
      // Get all users with role 'customer'
      const allUsers = await storage.getAllUsers();
      const customers = allUsers.filter(u => u.role === "customer");
      
      // Get aggregated data for each customer
      const customersWithData = await Promise.all(
        customers.map(async (customer) => {
          const [addresses, loyalty, orders, favorites] = await Promise.all([
            storage.getCustomerAddresses(customer.id),
            storage.getLoyaltyPoints(customer.id),
            storage.getAllOrders().then(orders => orders.filter(o => o.customerId === customer.id)),
            storage.getCustomerFavorites(customer.id),
          ]);
          
          const totalSpent = orders
            .filter(o => o.status === "completed" || o.status === "delivered")
            .reduce((sum, o) => sum + parseFloat(o.total || "0"), 0);
          
          return {
            ...customer,
            password: undefined, // Remove sensitive data
            addressCount: addresses.length,
            orderCount: orders.length,
            totalSpent,
            loyaltyPoints: loyalty?.availablePoints || 0,
            loyaltyTier: loyalty?.tier || "bronze",
            lifetimePoints: loyalty?.lifetimeEarned || 0,
            favoriteCount: favorites.length,
            lastOrderDate: orders.length > 0 
              ? new Date(Math.max(...orders.map(o => new Date(o.createdAt!).getTime())))
              : null,
          };
        })
      );
      
      // Apply search filter
      let filtered = customersWithData;
      if (search && typeof search === "string") {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(c => 
          c.fullName.toLowerCase().includes(searchLower) ||
          c.email.toLowerCase().includes(searchLower) ||
          (c.phone && c.phone.includes(search)) ||
          c.username.toLowerCase().includes(searchLower)
        );
      }
      
      // Apply tier filter
      if (tier && tier !== "all") {
        filtered = filtered.filter(c => c.loyaltyTier === tier);
      }
      
      // Apply sorting
      if (sortBy) {
        const order = sortOrder === "asc" ? 1 : -1;
        filtered.sort((a, b) => {
          switch (sortBy) {
            case "name": return a.fullName.localeCompare(b.fullName) * order;
            case "orders": return (a.orderCount - b.orderCount) * order;
            case "spent": return (a.totalSpent - b.totalSpent) * order;
            case "points": return (a.loyaltyPoints - b.loyaltyPoints) * order;
            case "date": 
              if (!a.lastOrderDate && !b.lastOrderDate) return 0;
              if (!a.lastOrderDate) return order;
              if (!b.lastOrderDate) return -order;
              return (new Date(a.lastOrderDate).getTime() - new Date(b.lastOrderDate).getTime()) * order;
            default: return 0;
          }
        });
      }
      
      res.json(filtered);
    } catch (error: any) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get single customer with full details
  app.get("/api/admin/customers/:customerId", authenticate, requirePermission("loyalty.view_customers"), async (req, res) => {
    try {
      const { customerId } = req.params;
      const customer = await storage.getUser(customerId);
      
      if (!customer || customer.role !== "customer") {
        return res.status(404).json({ error: "Customer not found" });
      }
      
      const [addresses, loyalty, loyaltyTransactions, orders, favorites] = await Promise.all([
        storage.getCustomerAddresses(customerId),
        storage.getLoyaltyPoints(customerId),
        storage.getLoyaltyTransactions(customerId),
        storage.getAllOrders().then(orders => orders.filter(o => o.customerId === customerId)),
        storage.getCustomerFavorites(customerId),
      ]);
      
      // Get menu items for favorites
      const menuItems = await storage.getAllMenuItems();
      const favoriteItems = favorites.map(fav => {
        const item = menuItems.find(m => m.id === fav.menuItemId);
        return item ? { ...fav, menuItem: item } : null;
      }).filter(Boolean);
      
      const totalSpent = orders
        .filter(o => o.status === "completed" || o.status === "delivered")
        .reduce((sum, o) => sum + parseFloat(o.total || "0"), 0);
      
      res.json({
        ...customer,
        password: undefined,
        addresses,
        orders: orders.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()),
        loyalty: loyalty || { customerId, totalPoints: 0, availablePoints: 0, lifetimeEarned: 0, lifetimeRedeemed: 0, tier: "bronze" },
        loyaltyTransactions: loyaltyTransactions.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()),
        favorites: favoriteItems,
        stats: {
          totalOrders: orders.length,
          completedOrders: orders.filter(o => o.status === "completed" || o.status === "delivered").length,
          cancelledOrders: orders.filter(o => o.status === "cancelled").length,
          totalSpent,
          averageOrderValue: orders.length > 0 ? totalSpent / orders.filter(o => o.status === "completed" || o.status === "delivered").length : 0,
        }
      });
    } catch (error: any) {
      console.error("Error fetching customer details:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Update customer loyalty points (admin adjustment)
  app.post("/api/admin/customers/:customerId/loyalty/adjust", authenticate, requirePermission("loyalty.manage_points"), async (req, res) => {
    try {
      const { customerId } = req.params;
      const { points, reason } = req.body;
      
      if (!points || !reason) {
        return res.status(400).json({ error: "Points and reason are required" });
      }
      
      const customer = await storage.getUser(customerId);
      if (!customer || customer.role !== "customer") {
        return res.status(404).json({ error: "Customer not found" });
      }
      
      const currentLoyalty = await storage.getLoyaltyPoints(customerId);
      const currentAvailable = currentLoyalty?.availablePoints || 0;
      const currentTotal = currentLoyalty?.totalPoints || 0;
      const currentLifetimeEarned = currentLoyalty?.lifetimeEarned || 0;
      
      const newAvailable = Math.max(0, currentAvailable + points);
      const newTotal = Math.max(0, currentTotal + points);
      const newLifetimeEarned = points > 0 ? currentLifetimeEarned + points : currentLifetimeEarned;
      
      await storage.createOrUpdateLoyaltyPoints(customerId, {
        availablePoints: newAvailable,
        totalPoints: newTotal,
        lifetimeEarned: newLifetimeEarned,
      });
      
      await storage.createLoyaltyTransaction({
        customerId,
        transactionType: "adjustment",
        points,
        balanceAfter: newAvailable,
        description: `Admin adjustment: ${reason}`,
      });
      
      res.json({ success: true, newBalance: newAvailable });
    } catch (error: any) {
      console.error("Error adjusting loyalty points:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get customer statistics overview
  app.get("/api/admin/customers/stats/overview", authenticate, requirePermission("loyalty.view_customers"), async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const customers = allUsers.filter(u => u.role === "customer");
      const allOrders = await storage.getAllOrders();
      
      // Get loyalty data for all customers
      const loyaltyData = await Promise.all(
        customers.map(c => storage.getLoyaltyPoints(c.id))
      );
      
      const tierCounts = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
      let totalLoyaltyPoints = 0;
      
      loyaltyData.forEach(l => {
        if (l) {
          tierCounts[l.tier as keyof typeof tierCounts]++;
          totalLoyaltyPoints += l.availablePoints;
        } else {
          tierCounts.bronze++;
        }
      });
      
      const customerOrders = allOrders.filter(o => o.customerId);
      const completedOrders = customerOrders.filter(o => o.status === "completed" || o.status === "delivered");
      const totalRevenue = completedOrders.reduce((sum, o) => sum + parseFloat(o.total || "0"), 0);
      
      // Active customers (ordered in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const activeCustomers = new Set(
        customerOrders
          .filter(o => new Date(o.createdAt!) >= thirtyDaysAgo)
          .map(o => o.customerId)
      ).size;
      
      res.json({
        totalCustomers: customers.length,
        activeCustomers,
        totalOrders: customerOrders.length,
        totalRevenue,
        averageOrderValue: completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0,
        totalLoyaltyPoints,
        tierDistribution: tierCounts,
      });
    } catch (error: any) {
      console.error("Error fetching customer stats:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== Customer Addresses Routes ====================
  
  app.get("/api/customers/:customerId/addresses", authenticate, async (req, res) => {
    try {
      const { customerId } = req.params;
      if (req.user!.role !== "admin" && req.user!.role !== "staff" && req.user!.id !== customerId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const addresses = await storage.getCustomerAddresses(customerId);
      res.json(addresses);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/customers/:customerId/addresses", authenticate, async (req, res) => {
    try {
      const { customerId } = req.params;
      if (req.user!.role !== "admin" && req.user!.role !== "staff" && req.user!.id !== customerId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const address = await storage.createCustomerAddress({ ...req.body, customerId });
      res.status(201).json(address);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/customers/:customerId/addresses/:id", authenticate, async (req, res) => {
    try {
      const { customerId, id } = req.params;
      if (req.user!.role !== "admin" && req.user!.role !== "staff" && req.user!.id !== customerId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      // SECURITY: Verify ownership before update
      const existing = await storage.getCustomerAddress(id);
      if (!existing || existing.customerId !== customerId) {
        return res.status(404).json({ error: "Address not found" });
      }
      
      const address = await storage.updateCustomerAddress(id, req.body);
      res.json(address);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/customers/:customerId/addresses/:id", authenticate, async (req, res) => {
    try {
      const { customerId, id } = req.params;
      if (req.user!.role !== "admin" && req.user!.role !== "staff" && req.user!.id !== customerId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      // SECURITY: Verify ownership before delete
      const existing = await storage.getCustomerAddress(id);
      if (!existing || existing.customerId !== customerId) {
        return res.status(404).json({ error: "Address not found" });
      }
      
      await storage.deleteCustomerAddress(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/customers/:customerId/addresses/:id/set-default", authenticate, async (req, res) => {
    try {
      const { customerId, id } = req.params;
      if (req.user!.role !== "admin" && req.user!.role !== "staff" && req.user!.id !== customerId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      // SECURITY: Verify ownership before setting default
      const existing = await storage.getCustomerAddress(id);
      if (!existing || existing.customerId !== customerId) {
        return res.status(404).json({ error: "Address not found" });
      }
      
      await storage.setDefaultAddress(customerId, id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== Customer Favorites ====================
  
  app.get("/api/customers/:customerId/favorites", authenticate, async (req, res) => {
    try {
      const { customerId } = req.params;
      if (req.user!.role !== "admin" && req.user!.role !== "staff" && req.user!.id !== customerId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const favorites = await storage.getCustomerFavorites(customerId);
      res.json(favorites);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/customers/:customerId/favorites", authenticate, async (req, res) => {
    try {
      const { customerId } = req.params;
      const { menuItemId } = req.body;
      if (req.user!.role !== "admin" && req.user!.role !== "staff" && req.user!.id !== customerId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const favorite = await storage.addFavorite(customerId, menuItemId);
      res.status(201).json(favorite);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/customers/:customerId/favorites/:menuItemId", authenticate, async (req, res) => {
    try {
      const { customerId, menuItemId } = req.params;
      if (req.user!.role !== "admin" && req.user!.role !== "staff" && req.user!.id !== customerId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      await storage.removeFavorite(customerId, menuItemId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== Loyalty Points ====================
  
  app.get("/api/customers/:customerId/loyalty", authenticate, async (req, res) => {
    try {
      const { customerId } = req.params;
      if (req.user!.role !== "admin" && req.user!.role !== "staff" && req.user!.id !== customerId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const points = await storage.getLoyaltyPoints(customerId);
      res.json(points || { customerId, totalPoints: 0, availablePoints: 0, lifetimeEarned: 0, lifetimeRedeemed: 0, tier: "bronze" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/customers/:customerId/loyalty/transactions", authenticate, async (req, res) => {
    try {
      const { customerId } = req.params;
      if (req.user!.role !== "admin" && req.user!.role !== "staff" && req.user!.id !== customerId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const transactions = await storage.getLoyaltyTransactions(customerId);
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/customers/:customerId/loyalty/redeem", authenticate, async (req, res) => {
    try {
      const { customerId } = req.params;
      const { points, orderId } = req.body;
      if (req.user!.role !== "admin" && req.user!.role !== "staff" && req.user!.id !== customerId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const loyaltyPoints = await storage.getLoyaltyPoints(customerId);
      if (!loyaltyPoints || loyaltyPoints.availablePoints < points) {
        return res.status(400).json({ error: "Insufficient points" });
      }
      const newAvailable = loyaltyPoints.availablePoints - points;
      const newRedeemed = loyaltyPoints.lifetimeRedeemed + points;
      await storage.createOrUpdateLoyaltyPoints(customerId, {
        availablePoints: newAvailable,
        lifetimeRedeemed: newRedeemed
      });
      await storage.createLoyaltyTransaction({
        customerId,
        orderId,
        transactionType: "redeem",
        points: -points,
        balanceAfter: newAvailable,
        description: `Redeemed ${points} points`
      });
      res.json({ success: true, newBalance: newAvailable });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== Order History ====================
  
  app.get("/api/customers/:customerId/orders", authenticate, async (req, res) => {
    try {
      const { customerId } = req.params;
      if (req.user!.role !== "admin" && req.user!.role !== "staff" && req.user!.id !== customerId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const orders = await storage.getAllOrders();
      const customerOrders = orders.filter(o => o.customerId === customerId);
      res.json(customerOrders);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/customers/:customerId/orders/:orderId/reorder", authenticate, async (req, res) => {
    try {
      const { customerId, orderId } = req.params;
      
      // Verify user owns this customer account
      if (req.user!.role !== "admin" && req.user!.role !== "staff" && req.user!.id !== customerId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      // Get the original order
      const originalOrder = await storage.getOrder(orderId);
      if (!originalOrder) {
        return res.status(404).json({ error: "Original order not found" });
      }
      
      // Security: For non-admin/staff, verify the order belongs to the authenticated user
      if (req.user!.role !== "admin" && req.user!.role !== "staff") {
        if (originalOrder.customerId !== req.user!.id) {
          return res.status(403).json({ error: "You can only reorder your own orders" });
        }
      } else {
        // Admin/staff can reorder for any customer, but verify order belongs to target customer
        if (originalOrder.customerId !== customerId) {
          return res.status(403).json({ error: "Order does not belong to this customer" });
        }
      }
      
      // Validate payload using schema before creating order
      const newOrderPayload = insertOrderSchema.parse({
        orderNumber: `ORD-${Date.now()}-${(await storage.getAllOrders()).length + 1}`,
        customerId: originalOrder.customerId!,
        branchId: originalOrder.branchId,
        customerName: originalOrder.customerName,
        customerPhone: originalOrder.customerPhone,
        alternativePhone: originalOrder.alternativePhone,
        customerAddress: originalOrder.customerAddress,
        deliveryArea: originalOrder.deliveryArea,
        orderType: originalOrder.orderType,
        orderSource: "online", // Reorders are always online
        paymentMethod: originalOrder.paymentMethod,
        paymentStatus: "pending", // Reset payment status
        items: originalOrder.items, // Copy same items
        subtotal: originalOrder.subtotal,
        discount: "0", // Reset discount for new order
        discountReason: null,
        deliveryCharges: originalOrder.deliveryCharges,
        deliveryDistance: originalOrder.deliveryDistance,
        total: originalOrder.total,
        status: "pending", // New order starts as pending
        notes: originalOrder.notes,
      });
      
      // Create new order with validated payload
      const newOrder = await storage.createOrder(newOrderPayload);
      
      res.json(newOrder);
    } catch (error: any) {
      console.error("Reorder error:", error);
      res.status(500).json({ error: error.message || "Failed to reorder" });
    }
  });

  // ==================== Refunds ====================
  
  app.get("/api/refunds", authenticate, authorize("admin", "staff"), async (req, res) => {
    try {
      const refunds = await storage.getAllRefunds();
      res.json(refunds);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/orders/:orderId/refunds", authenticate, async (req, res) => {
    try {
      const { orderId } = req.params;
      const refunds = await storage.getRefundsByOrder(orderId);
      res.json(refunds);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/refunds", authenticate, authorize("admin", "staff"), async (req, res) => {
    try {
      const { orderId, refundAmount, refundMethod, reason, branchId, notes } = req.body;
      
      // Get the order to check payment method
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Validate refund amount
      const refundAmountNum = parseFloat(refundAmount);
      if (isNaN(refundAmountNum) || refundAmountNum <= 0) {
        return res.status(400).json({ error: "Invalid refund amount" });
      }

      // Check if order total is sufficient
      const orderTotal = parseFloat(order.total || "0");
      if (refundAmountNum > orderTotal) {
        return res.status(400).json({ error: "Refund amount exceeds order total" });
      }

      // Get existing refunds for this order to prevent over-refunding
      const existingRefunds = await storage.getRefundsByOrder(orderId);
      const totalRefunded = existingRefunds
        .filter(r => r.status === "completed" || r.status === "pending")
        .reduce((sum, r) => sum + parseFloat(r.refundAmount || "0"), 0);
      
      if (totalRefunded + refundAmountNum > orderTotal) {
        return res.status(400).json({ 
          error: `Cannot refund ₨${refundAmountNum.toFixed(2)}. Already refunded ₨${totalRefunded.toFixed(2)} of ₨${orderTotal.toFixed(2)} total.` 
        });
      }

      let stripeRefundId: string | undefined;

      // If order was paid via Stripe, process refund through Stripe
      if (refundMethod === "card" || order.paymentMethod === "stripe") {
        // Validate Stripe payment intent exists
        if (!order.stripePaymentIntentId) {
          return res.status(400).json({ 
            error: "Cannot process card refund: Order does not have a Stripe payment intent ID" 
          });
        }

        try {
          const { stripeService } = await import('./stripeService');
          const stripeRefund = await stripeService.createRefund({
            paymentIntentId: order.stripePaymentIntentId,
            amount: refundAmountNum,
            reason: reason || undefined,
          });
          stripeRefundId = stripeRefund.id;
        } catch (stripeError: any) {
          console.error("Stripe refund error:", stripeError);
          return res.status(500).json({ 
            error: "Failed to process Stripe refund: " + stripeError.message 
          });
        }
      }

      // Only persist refund after successful Stripe API call (if applicable)
      const refund = await storage.createRefund({
        orderId,
        refundAmount: refundAmountNum.toString(),
        refundMethod,
        reason,
        branchId,
        notes,
        stripeRefundId,
        processedBy: req.user!.id
      });
      
      res.status(201).json(refund);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/refunds/:id", authenticate, authorize("admin", "staff"), async (req, res) => {
    try {
      const { id } = req.params;
      const refund = await storage.updateRefund(id, {
        ...req.body,
        processedBy: req.user!.id,
        processedAt: req.body.status === "completed" ? new Date() : undefined
      });
      res.json(refund);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== Suppliers ====================
  
  app.get("/api/suppliers", authenticate, authorize("admin", "staff"), async (req, res) => {
    try {
      const suppliers = await storage.getAllSuppliers();
      res.json(suppliers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/suppliers", authenticate, authorize("admin", "staff"), async (req, res) => {
    try {
      const supplier = await storage.createSupplier(req.body);
      res.status(201).json(supplier);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/suppliers/:id", authenticate, authorize("admin", "staff"), async (req, res) => {
    try {
      const { id } = req.params;
      const supplier = await storage.updateSupplier(id, req.body);
      res.json(supplier);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/suppliers/:id", authenticate, authorize("admin", "staff"), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteSupplier(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== Inventory ====================
  
  app.get("/api/inventory/transactions", authenticate, authorize("admin", "staff"), async (req, res) => {
    try {
      const { branchId } = req.query;
      const { branchId: effectiveBranchId, requiresFilter } = requireBranchAccess(req, branchId as string | undefined);
      const transactions = requiresFilter && effectiveBranchId
        ? await storage.getInventoryTransactionsByBranch(effectiveBranchId)
        : await storage.getAllInventoryTransactions();
      res.json(transactions);
    } catch (error: any) {
      const statusCode = (error as any).statusCode || 500;
      res.status(statusCode).json({ error: error.message });
    }
  });

  app.post("/api/inventory/transactions", authenticate, authorize("admin", "staff"), async (req, res) => {
    try {
      const transaction = await storage.createInventoryTransaction({
        ...req.body,
        performedBy: req.user!.id
      });
      res.status(201).json(transaction);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/inventory/wastage/:branchId", authenticate, authorize("admin", "staff"), async (req, res) => {
    try {
      const { branchId } = req.params;
      const wastage = await storage.getStockWastage(branchId);
      res.json(wastage);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/inventory/wastage", authenticate, authorize("admin", "staff"), async (req, res) => {
    try {
      const wastage = await storage.createStockWastage({
        ...req.body,
        reportedBy: req.user!.id
      });
      res.status(201).json(wastage);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/inventory/reorder-points/:branchId", authenticate, authorize("admin", "staff"), async (req, res) => {
    try {
      const { branchId } = req.params;
      const points = await storage.getReorderPoints(branchId);
      res.json(points);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/inventory/low-stock/:branchId", authenticate, authorize("admin", "staff"), async (req, res) => {
    try {
      const { branchId } = req.params;
      const lowStock = await storage.checkLowStock(branchId);
      res.json(lowStock);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/inventory/reorder-points", authenticate, authorize("admin", "staff"), async (req, res) => {
    try {
      const point = await storage.createReorderPoint(req.body);
      res.status(201).json(point);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/inventory/reorder-points/:id", authenticate, authorize("admin", "staff"), async (req, res) => {
    try {
      const { id } = req.params;
      const point = await storage.updateReorderPoint(id, req.body);
      res.json(point);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/inventory/reorder-points/:id", authenticate, authorize("admin", "staff"), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteReorderPoint(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== Payment Processing ====================
  
  // Create Stripe payment intent for an order
  app.post("/api/payments/stripe/create-intent", authenticate, async (req, res) => {
    try {
      const { orderId } = req.body;
      
      if (!orderId) {
        return res.status(400).json({ error: "Order ID is required" });
      }

      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Verify ownership for customers
      if (req.user!.role === "customer" && order.customerId !== req.user!.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const { stripeService } = await import('./stripeService');
      const user = req.user!.email ? req.user! : await storage.getUserByEmail(order.customerName);
      
      const paymentIntent = await stripeService.createPaymentIntent({
        amount: parseFloat(order.total),
        customerEmail: user?.email || order.customerName,
        orderId: order.id,
        orderNumber: order.orderNumber,
        description: `Kebabish Pizza Order ${order.orderNumber}`,
      });

      // Update order with Stripe payment intent ID
      await storage.updateOrder(orderId, {
        ...order,
        discount: order.discount ?? undefined,
        deliveryCharges: order.deliveryCharges ?? undefined,
        deliveryDistance: order.deliveryDistance || undefined,
        paymentMethod: "stripe",
        stripePaymentIntentId: paymentIntent.id,
      });

      res.json({ 
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      });
    } catch (error: any) {
      console.error("Stripe payment intent error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Verify Stripe payment status
  app.post("/api/payments/stripe/verify", authenticate, async (req, res) => {
    try {
      const { paymentIntentId } = req.body;
      
      if (!paymentIntentId) {
        return res.status(400).json({ error: "Payment intent ID is required" });
      }

      const { stripeService } = await import('./stripeService');
      const paymentIntent = await stripeService.retrievePaymentIntent(paymentIntentId);

      // Find order by payment intent ID
      const orders = await storage.getAllOrders();
      const order = orders.find(o => o.stripePaymentIntentId === paymentIntentId);

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Update order payment status based on Stripe status
      let paymentStatus = "pending";
      if (paymentIntent.status === "succeeded") {
        paymentStatus = "paid";
      } else if (paymentIntent.status === "processing") {
        paymentStatus = "awaiting_verification";
      } else if (paymentIntent.status === "requires_payment_method" || paymentIntent.status === "canceled") {
        paymentStatus = "failed";
      }

      await storage.updateOrder(order.id, {
        ...order,
        discount: order.discount ?? undefined,
        deliveryCharges: order.deliveryCharges ?? undefined,
        deliveryDistance: order.deliveryDistance || undefined,
        paymentStatus,
      });

      res.json({ 
        status: paymentIntent.status,
        paymentStatus,
      });
    } catch (error: any) {
      console.error("Stripe verification error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get Stripe publishable key for frontend
  app.get("/api/payments/stripe/config", async (_req, res) => {
    try {
      const { getStripePublishableKey } = await import('./stripeClient');
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error: any) {
      console.error("Stripe config error:", error);
      res.status(500).json({ error: "Stripe not configured" });
    }
  });

  // Create JazzCash payment session
  app.post("/api/payments/jazzcash/create", authenticate, async (req, res) => {
    try {
      const { orderId, returnUrl } = req.body;
      
      if (!orderId || !returnUrl) {
        return res.status(400).json({ error: "Order ID and return URL are required" });
      }

      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Verify order belongs to user (unless admin/staff)
      if (req.user!.role === "customer" && order.customerId !== req.user!.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Verify order is eligible for payment
      if (order.paymentStatus === "paid") {
        return res.status(400).json({ error: "Order is already paid" });
      }
      
      if (order.status === "cancelled" || order.status === "refunded") {
        return res.status(400).json({ error: "Cannot process payment for cancelled or refunded order" });
      }

      const { createJazzCashPayment, isJazzCashConfigured } = await import('./jazzCashService');
      
      if (!isJazzCashConfigured()) {
        return res.status(500).json({ error: "JazzCash is not configured" });
      }

      const customer = order.customerId ? await storage.getUser(order.customerId) : null;

      const payment = createJazzCashPayment({
        orderId: order.id,
        amount: parseFloat(order.total),
        billReference: order.orderNumber,
        description: `Order #${order.orderNumber} - Kebabish Pizza`,
        returnUrl,
        customerMobile: customer?.phone || undefined,
        customerEmail: customer?.email || undefined,
      });

      res.json(payment);
    } catch (error: any) {
      console.error("JazzCash session creation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Handle JazzCash payment callback/response
  app.post("/api/payments/jazzcash/callback", async (req, res) => {
    try {
      const { validateJazzCashResponse } = await import('./jazzCashService');
      
      const validation = validateJazzCashResponse(req.body);
      
      if (!validation.success) {
        console.error("JazzCash payment failed:", validation.responseMessage);
        return res.redirect(`/payment-result?status=failed&message=${encodeURIComponent(validation.responseMessage)}`);
      }

      // Get order from custom field
      const orderId = validation.orderId;
      if (!orderId) {
        console.error("No order ID in JazzCash response");
        return res.redirect('/payment-result?status=failed&message=Invalid+response');
      }

      const order = await storage.getOrder(orderId);
      if (!order) {
        console.error("Order not found:", orderId);
        return res.redirect('/payment-result?status=failed&message=Order+not+found');
      }

      // Validate payment amount matches order total
      const orderTotal = parseFloat(order.total);
      if (validation.amount && Math.abs(validation.amount - orderTotal) > 0.01) {
        console.error("Amount mismatch:", validation.amount, "vs", orderTotal);
        return res.redirect(`/payment-result?status=failed&message=Payment+amount+mismatch`);
      }

      // Update order with successful payment
      await storage.updateOrder(orderId, {
        ...order,
        discount: order.discount ?? undefined,
        deliveryCharges: order.deliveryCharges ?? undefined,
        deliveryDistance: order.deliveryDistance || undefined,
        paymentMethod: "jazzcash",
        paymentStatus: "paid",
        jazzCashTransactionId: validation.transactionId,
        notes: `${order.notes || ""}\nJazzCash Payment: ${validation.transactionId} - ${validation.responseMessage}`.trim(),
      });

      // Redirect to success page
      res.redirect(`/payment-result?status=success&orderId=${orderId}`);
    } catch (error: any) {
      console.error("JazzCash callback error:", error);
      res.redirect(`/payment-result?status=failed&message=${encodeURIComponent(error.message)}`);
    }
  });

  // Get JazzCash configuration status (admin only)
  app.get("/api/payments/jazzcash/config", authenticate, authorize("admin"), async (req, res) => {
    try {
      const { isJazzCashConfigured } = await import('./jazzCashService');
      const configured = isJazzCashConfigured();
      const environment = process.env.JAZZCASH_BASE_URL?.includes('sandbox') ? 'sandbox' : 'production';
      
      res.json({ configured, environment });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get JazzCash transactions (admin only)
  app.get("/api/payments/jazzcash/transactions", authenticate, authorize("admin"), async (req, res) => {
    try {
      const orders = await storage.getAllOrders();
      const jazzCashOrders = orders
        .filter(order => order.paymentMethod === "jazzcash" && order.jazzCashTransactionId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 50); // Last 50 transactions
      
      res.json(jazzCashOrders);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get JazzCash statistics (admin only)
  app.get("/api/payments/jazzcash/stats", authenticate, authorize("admin"), async (req, res) => {
    try {
      const orders = await storage.getAllOrders();
      const jazzCashOrders = orders.filter(order => order.paymentMethod === "jazzcash");
      
      const totalTransactions = jazzCashOrders.length;
      const successfulTransactions = jazzCashOrders.filter(order => order.paymentStatus === "paid").length;
      const pendingCount = jazzCashOrders.filter(order => order.paymentStatus === "pending").length;
      const totalAmount = jazzCashOrders
        .filter(order => order.paymentStatus === "paid")
        .reduce((sum, order) => sum + parseFloat(order.total), 0);
      const successRate = totalTransactions > 0 ? Math.round((successfulTransactions / totalTransactions) * 100) : 0;
      
      res.json({
        totalTransactions,
        successfulTransactions,
        pendingCount,
        totalAmount,
        successRate,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Analytics: Overview
  app.get("/api/analytics/overview", authenticate, authorize("admin"), async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const allOrders = await storage.getAllOrders();
      const orders = allOrders.filter(order => new Date(order.createdAt) >= cutoffDate);
      const paidOrders = orders.filter(order => order.paymentStatus === "paid");
      
      const totalRevenue = paidOrders.reduce((sum, order) => sum + parseFloat(order.total), 0);
      const totalOrders = orders.length;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      
      const users = await storage.getAllUsers();
      const newCustomers = users.filter(user => 
        user.role === "customer" && new Date(user.createdAt) >= cutoffDate
      ).length;
      
      const menuItems = await storage.getAllMenuItems();
      const orderItems = orders.flatMap(order => order.items || []);
      const itemCounts = orderItems.reduce((acc, item) => {
        const id = typeof item === 'string' ? item : (item as any).menuItemId;
        acc[id] = (acc[id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const topProductId = Object.entries(itemCounts).sort((a, b) => b[1] - a[1])[0];
      const topProduct = topProductId ? menuItems.find(m => m.id === topProductId[0]) : null;
      
      res.json({
        totalRevenue,
        totalOrders,
        averageOrderValue,
        newCustomers,
        totalCustomers: users.filter(u => u.role === "customer").length,
        revenueChange: 12, // Placeholder
        topProduct: topProduct ? { name: topProduct.name, sales: topProductId[1] } : null,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Analytics: Sales Trends
  app.get("/api/analytics/sales-trends", authenticate, authorize("admin"), async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const allOrders = await storage.getAllOrders();
      const orders = allOrders.filter(order => new Date(order.createdAt) >= cutoffDate);
      
      // Daily revenue
      const dailyData: Record<string, number> = {};
      orders.forEach(order => {
        if (order.paymentStatus === "paid") {
          const date = new Date(order.createdAt).toISOString().split('T')[0];
          dailyData[date] = (dailyData[date] || 0) + parseFloat(order.total);
        }
      });
      
      const daily = Object.entries(dailyData).map(([date, revenue]) => ({ date, revenue }));
      
      // By status
      const statusCounts = orders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const byStatus = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
      
      // By payment method
      const paymentData = orders.reduce((acc, order) => {
        if (order.paymentStatus === "paid") {
          const method = order.paymentMethod || "cash";
          acc[method] = (acc[method] || 0) + parseFloat(order.total);
        }
        return acc;
      }, {} as Record<string, number>);
      
      const byPaymentMethod = Object.entries(paymentData).map(([method, amount]) => ({ method, amount }));
      
      res.json({ daily, byStatus, byPaymentMethod });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Analytics: Customer Behavior
  app.get("/api/analytics/customer-behavior", authenticate, authorize("admin"), async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const allOrders = await storage.getAllOrders();
      const orders = allOrders.filter(order => new Date(order.createdAt) >= cutoffDate);
      
      // Customer spending
      const customerSpending: Record<string, { totalSpent: number; orders: number; name: string; email: string; loyaltyPoints: number }> = {};
      
      for (const order of orders) {
        if (order.customerId && order.paymentStatus === "paid") {
          if (!customerSpending[order.customerId]) {
            const user = await storage.getUser(order.customerId);
            customerSpending[order.customerId] = {
              totalSpent: 0,
              orders: 0,
              name: user?.name || "",
              email: user?.email || "",
              loyaltyPoints: user?.loyaltyPoints || 0,
            };
          }
          customerSpending[order.customerId].totalSpent += parseFloat(order.total);
          customerSpending[order.customerId].orders += 1;
        }
      }
      
      const topCustomers = Object.entries(customerSpending)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10);
      
      res.json({
        topCustomers,
        retention: [], // Placeholder
        lifetimeValue: [], // Placeholder
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Analytics: Product Performance
  app.get("/api/analytics/product-performance", authenticate, authorize("admin"), async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const allOrders = await storage.getAllOrders();
      const orders = allOrders.filter(order => 
        new Date(order.createdAt) >= cutoffDate && order.paymentStatus === "paid"
      );
      
      const menuItems = await storage.getAllMenuItems();
      const categories = await storage.getAllCategories();
      
      // Product sales
      const productSales: Record<string, { quantity: number; revenue: number }> = {};
      let totalItems = 0;
      
      orders.forEach(order => {
        const items = order.items || [];
        totalItems += items.length;
        items.forEach((item: any) => {
          const id = typeof item === 'string' ? item : item.menuItemId;
          const quantity = typeof item === 'string' ? 1 : (item.quantity || 1);
          const menuItem = menuItems.find(m => m.id === id);
          const price = menuItem ? parseFloat(menuItem.price) : 0;
          
          if (!productSales[id]) {
            productSales[id] = { quantity: 0, revenue: 0 };
          }
          productSales[id].quantity += quantity;
          productSales[id].revenue += price * quantity;
        });
      });
      
      const topSelling = Object.entries(productSales)
        .map(([id, data]) => {
          const menuItem = menuItems.find(m => m.id === id);
          return {
            id,
            name: menuItem?.name || "Unknown",
            ...data,
          };
        })
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);
      
      // Category revenue
      const categoryRevenue: Record<string, number> = {};
      Object.entries(productSales).forEach(([id, data]) => {
        const menuItem = menuItems.find(m => m.id === id);
        const categoryId = menuItem?.categoryId || "uncategorized";
        categoryRevenue[categoryId] = (categoryRevenue[categoryId] || 0) + data.revenue;
      });
      
      const totalCategoryRevenue = Object.values(categoryRevenue).reduce((sum, rev) => sum + rev, 0);
      
      const byCategory = Object.entries(categoryRevenue).map(([id, revenue]) => {
        const category = categories.find(c => c.id === id);
        return {
          name: category?.name || "Uncategorized",
          revenue,
          percentage: totalCategoryRevenue > 0 ? Math.round((revenue / totalCategoryRevenue) * 100) : 0,
        };
      });
      
      const topCategory = byCategory.sort((a, b) => b.revenue - a.revenue)[0]?.name || "N/A";
      
      res.json({
        topSelling,
        byCategory,
        avgItemsPerOrder: orders.length > 0 ? totalItems / orders.length : 0,
        topCategory,
        uniqueProducts: Object.keys(productSales).length,
        bestsellerRevenue: topSelling[0]?.revenue || 0,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Analytics: Peak Hours
  app.get("/api/analytics/peak-hours", authenticate, authorize("admin"), async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const allOrders = await storage.getAllOrders();
      const orders = allOrders.filter(order => new Date(order.createdAt) >= cutoffDate);
      
      // By hour
      const hourCounts: Record<number, number> = {};
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayCounts: Record<string, { orders: number; revenue: number }> = {};
      
      orders.forEach(order => {
        const date = new Date(order.createdAt);
        const hour = date.getHours();
        const day = dayNames[date.getDay()];
        
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        
        if (!dayCounts[day]) {
          dayCounts[day] = { orders: 0, revenue: 0 };
        }
        dayCounts[day].orders += 1;
        if (order.paymentStatus === "paid") {
          dayCounts[day].revenue += parseFloat(order.total);
        }
      });
      
      const byHour = Array.from({ length: 24 }, (_, i) => ({
        hour: `${i}:00`,
        orders: hourCounts[i] || 0,
      }));
      
      const byDay = dayNames.map(day => ({
        day,
        orders: dayCounts[day]?.orders || 0,
        revenue: dayCounts[day]?.revenue || 0,
      }));
      
      const busiestHourEntry = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
      const busiestDayEntry = Object.entries(dayCounts).sort((a, b) => b[1].orders - a[1].orders)[0];
      
      res.json({
        byHour,
        byDay,
        busiestHour: busiestHourEntry ? `${busiestHourEntry[0]}:00` : "N/A",
        busiestHourOrders: busiestHourEntry ? busiestHourEntry[1] : 0,
        busiestDay: busiestDayEntry ? busiestDayEntry[0] : "N/A",
        busiestDayOrders: busiestDayEntry ? busiestDayEntry[1].orders : 0,
        avgResponseTime: 25, // Placeholder
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Verify JazzCash payment (staff only - for manual verification)
  app.post("/api/payments/jazzcash/verify", authenticate, authorize("admin", "staff"), async (req, res) => {
    try {
      const { orderId, approved, notes } = req.body;
      
      if (!orderId || approved === undefined) {
        return res.status(400).json({ error: "Order ID and approval status are required" });
      }

      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      if (order.paymentMethod !== "jazzcash") {
        return res.status(400).json({ error: "Order is not a JazzCash payment" });
      }

      const paymentStatus = approved ? "paid" : "failed";
      const verificationNotes = notes ? `\nJazzCash Verification by ${req.user!.username}: ${notes}` : "";

      await storage.updateOrder(orderId, {
        ...order,
        discount: order.discount ?? undefined,
        deliveryCharges: order.deliveryCharges ?? undefined,
        deliveryDistance: order.deliveryDistance || undefined,
        paymentStatus,
        notes: `${order.notes || ""}${verificationNotes}`.trim(),
      });

      res.json({ 
        success: true,
        paymentStatus,
      });
    } catch (error: any) {
      console.error("JazzCash verification error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get pending JazzCash payments for verification
  app.get("/api/payments/jazzcash/pending", authenticate, authorize("admin", "staff"), async (req, res) => {
    try {
      const orders = await storage.getAllOrders();
      const pendingJazzCash = orders.filter(
        o => o.paymentMethod === "jazzcash" && o.paymentStatus === "awaiting_verification"
      );
      res.json(pendingJazzCash);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // STAFF SHIFT MANAGEMENT ROUTES
  // ============================================

  // Staff Shifts - CRUD operations for shift templates
  app.get("/api/shifts", authenticate, authorize("admin", "staff"), async (req, res) => {
    try {
      const { branchId } = req.query;
      const { branchId: effectiveBranchId, requiresFilter } = requireBranchAccess(req, branchId as string | undefined);
      const shifts = requiresFilter && effectiveBranchId 
        ? await storage.getStaffShiftsByBranch(effectiveBranchId)
        : await storage.getAllStaffShifts();
      res.json(shifts);
    } catch (error: any) {
      const statusCode = (error as any).statusCode || 500;
      res.status(statusCode).json({ error: error.message });
    }
  });

  app.get("/api/shifts/:id", authenticate, authorize("admin", "staff"), async (req, res) => {
    try {
      const shift = await storage.getStaffShift(req.params.id);
      if (!shift) {
        return res.status(404).json({ error: "Shift not found" });
      }
      res.json(shift);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/shifts", authenticate, authorize("admin"), async (req, res) => {
    try {
      const shift = await storage.createStaffShift({
        ...req.body,
        createdBy: req.user!.id,
      });
      res.json(shift);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/shifts/:id", authenticate, authorize("admin"), async (req, res) => {
    try {
      const shift = await storage.updateStaffShift(req.params.id, req.body);
      if (!shift) {
        return res.status(404).json({ error: "Shift not found" });
      }
      res.json(shift);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/shifts/:id", authenticate, authorize("admin"), async (req, res) => {
    try {
      await storage.deleteStaffShift(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Shift Assignments - Assign shifts to staff members
  app.get("/api/shift-assignments", authenticate, authorize("admin", "staff"), async (req, res) => {
    try {
      const { userId, shiftId, startDate, endDate, branchId } = req.query;
      
      // Staff can only view their own assignments, admins can view all
      const effectiveUserId = req.user!.role === "admin" ? (userId as string | undefined) : req.user!.id;
      
      let assignments;
      if (effectiveUserId) {
        assignments = await storage.getShiftAssignmentsByUser(effectiveUserId);
      } else if (shiftId) {
        assignments = await storage.getShiftAssignmentsByShift(shiftId as string);
      } else if (startDate && endDate) {
        assignments = await storage.getShiftAssignmentsByDateRange(
          new Date(startDate as string),
          new Date(endDate as string),
          branchId as string
        );
      } else {
        assignments = await storage.getAllShiftAssignments();
      }
      
      res.json(assignments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/shift-assignments/:id", authenticate, authorize("admin", "staff"), async (req, res) => {
    try {
      const assignment = await storage.getShiftAssignment(req.params.id);
      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }
      
      // Staff can only view their own assignments
      if (req.user!.role !== "admin" && assignment.userId !== req.user!.id) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      res.json(assignment);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/shift-assignments", authenticate, authorize("admin", "staff"), async (req, res) => {
    try {
      const { userId, startDateTime, endDateTime } = req.body;
      
      // Only admins can assign shifts to other users
      if (req.user!.role !== "admin" && userId !== req.user!.id) {
        return res.status(403).json({ error: "Staff members can only create assignments for themselves. Contact an admin to assign shifts to others." });
      }
      
      // Check for scheduling conflicts
      const hasConflict = await storage.checkShiftConflict(
        userId,
        new Date(startDateTime),
        new Date(endDateTime)
      );
      
      if (hasConflict) {
        return res.status(409).json({ error: "Shift conflict detected. This user already has a shift during this time." });
      }
      
      const assignment = await storage.createShiftAssignment({
        ...req.body,
        assignedBy: req.user!.id,
      });
      
      res.json(assignment);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/shift-assignments/:id", authenticate, authorize("admin", "staff"), async (req, res) => {
    try {
      const { userId, startDateTime, endDateTime } = req.body;
      
      // Get existing assignment to check ownership
      const existingAssignment = await storage.getShiftAssignment(req.params.id);
      if (!existingAssignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }
      
      // Only admins can update assignments for other users
      if (req.user!.role !== "admin" && existingAssignment.userId !== req.user!.id) {
        return res.status(403).json({ error: "Staff members can only update their own assignments" });
      }
      
      // Staff cannot change the userId field
      if (req.user!.role !== "admin" && userId && userId !== existingAssignment.userId) {
        return res.status(403).json({ error: "Staff members cannot reassign shifts to other users" });
      }
      
      // Check for conflicts if times are being updated
      if (userId && startDateTime && endDateTime) {
        const hasConflict = await storage.checkShiftConflict(
          userId,
          new Date(startDateTime),
          new Date(endDateTime),
          req.params.id
        );
        
        if (hasConflict) {
          return res.status(409).json({ error: "Shift conflict detected. This user already has a shift during this time." });
        }
      }
      
      const assignment = await storage.updateShiftAssignment(req.params.id, req.body);
      res.json(assignment);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/shift-assignments/:id", authenticate, authorize("admin", "staff"), async (req, res) => {
    try {
      // Get existing assignment to check ownership
      const existingAssignment = await storage.getShiftAssignment(req.params.id);
      if (!existingAssignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }
      
      // Only admins can delete assignments for other users
      if (req.user!.role !== "admin" && existingAssignment.userId !== req.user!.id) {
        return res.status(403).json({ error: "Staff members can only delete their own assignments" });
      }
      
      await storage.deleteShiftAssignment(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Check shift conflict before scheduling
  app.post("/api/shift-assignments/check-conflict", authenticate, authorize("admin", "staff"), async (req, res) => {
    try {
      const { userId, startDateTime, endDateTime, excludeAssignmentId } = req.body;
      
      const hasConflict = await storage.checkShiftConflict(
        userId,
        new Date(startDateTime),
        new Date(endDateTime),
        excludeAssignmentId
      );
      
      res.json({ hasConflict });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Shift Attendance - Clock in/out functionality
  app.get("/api/attendance", authenticate, async (req, res) => {
    try {
      const { userId, assignmentId } = req.query;
      
      let attendance;
      if (assignmentId) {
        attendance = await storage.getShiftAttendanceByAssignment(assignmentId as string);
        res.json(attendance || null);
      } else if (userId) {
        attendance = await storage.getShiftAttendanceByUser(userId as string);
        res.json(attendance);
      } else if (req.user?.role === "admin" || req.user?.role === "staff") {
        attendance = await storage.getAllShiftAttendance();
        res.json(attendance);
      } else {
        // Regular users can only see their own attendance
        attendance = await storage.getShiftAttendanceByUser(req.user!.id);
        res.json(attendance);
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/attendance/active", authenticate, async (req, res) => {
    try {
      const userId = req.query.userId as string || req.user!.id;
      
      // Non-admin users can only check their own active attendance
      if (userId !== req.user!.id && req.user!.role !== "admin" && req.user!.role !== "staff") {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const active = await storage.getActiveAttendance(userId);
      res.json(active || null);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/attendance/clock-in", authenticate, async (req, res) => {
    try {
      const { assignmentId, clockInLatitude, clockInLongitude } = req.body;
      
      // Check if user already has an active attendance
      const active = await storage.getActiveAttendance(req.user!.id);
      if (active) {
        return res.status(400).json({ error: "You are already clocked in. Please clock out first." });
      }
      
      const attendance = await storage.clockIn({
        assignmentId,
        userId: req.user!.id,
        clockInTime: new Date(),
        clockInLatitude,
        clockInLongitude,
      });
      
      res.json(attendance);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/attendance/clock-out/:id", authenticate, async (req, res) => {
    try {
      const { clockOutLatitude, clockOutLongitude } = req.body;
      
      // Verify the attendance belongs to the user or user is admin/staff
      const attendance = await storage.getShiftAttendance(req.params.id);
      if (!attendance) {
        return res.status(404).json({ error: "Attendance record not found" });
      }
      
      if (attendance.userId !== req.user!.id && req.user!.role !== "admin" && req.user!.role !== "staff") {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const updated = await storage.clockOut(req.params.id, {
        clockOutTime: new Date(),
        clockOutLatitude,
        clockOutLongitude,
      });
      
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Staff Availability - Manage when staff are available
  app.get("/api/staff-availability", authenticate, async (req, res) => {
    try {
      const { userId } = req.query;
      
      if (userId) {
        const availability = await storage.getStaffAvailabilityByUser(userId as string);
        res.json(availability);
      } else if (req.user?.role === "admin" || req.user?.role === "staff") {
        const availability = await storage.getAllStaffAvailability();
        res.json(availability);
      } else {
        // Regular users can only see their own availability
        const availability = await storage.getStaffAvailabilityByUser(req.user!.id);
        res.json(availability);
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/staff-availability/check", authenticate, authorize("admin", "staff"), async (req, res) => {
    try {
      const { userId, dayOfWeek, time } = req.body;
      const isAvailable = await storage.checkStaffAvailable(userId, dayOfWeek, time);
      res.json({ isAvailable });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/staff-availability", authenticate, async (req, res) => {
    try {
      // Staff can only create their own availability, admin can create for anyone
      const userId = req.user!.role === "admin" ? req.body.userId : req.user!.id;
      
      const availability = await storage.createStaffAvailability({
        ...req.body,
        userId,
      });
      
      res.json(availability);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/staff-availability/:id", authenticate, async (req, res) => {
    try {
      const existing = await storage.getStaffAvailability(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Availability not found" });
      }
      
      // Users can only update their own availability, admin can update anyone's
      if (existing.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const availability = await storage.updateStaffAvailability(req.params.id, req.body);
      res.json(availability);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/staff-availability/:id", authenticate, async (req, res) => {
    try {
      const existing = await storage.getStaffAvailability(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Availability not found" });
      }
      
      // Users can only delete their own availability, admin can delete anyone's
      if (existing.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      await storage.deleteStaffAvailability(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Overtime Records - Track and manage overtime
  app.get("/api/overtime", authenticate, async (req, res) => {
    try {
      const { userId, startDate, endDate } = req.query;
      
      let records;
      if (userId && startDate && endDate) {
        records = await storage.getOvertimeRecordsByPayPeriod(
          new Date(startDate as string),
          new Date(endDate as string),
          userId as string
        );
      } else if (startDate && endDate) {
        records = await storage.getOvertimeRecordsByPayPeriod(
          new Date(startDate as string),
          new Date(endDate as string)
        );
      } else if (userId) {
        records = await storage.getOvertimeRecordsByUser(userId as string);
      } else if (req.user?.role === "admin" || req.user?.role === "staff") {
        records = await storage.getAllOvertimeRecords();
      } else {
        // Regular users can only see their own overtime
        records = await storage.getOvertimeRecordsByUser(req.user!.id);
      }
      
      res.json(records);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/overtime/mark-paid", authenticate, authorize("admin"), async (req, res) => {
    try {
      const { overtimeIds, paidDate } = req.body;
      
      if (!Array.isArray(overtimeIds) || overtimeIds.length === 0) {
        return res.status(400).json({ error: "Invalid overtime IDs" });
      }
      
      await storage.markOvertimePaid(overtimeIds, new Date(paidDate || Date.now()));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Marketing Campaigns Routes
  app.get("/api/marketing-campaigns", authenticate, authorize("admin"), async (req, res) => {
    try {
      const { status, branchId } = req.query;
      
      let campaigns;
      if (status) {
        campaigns = await storage.getMarketingCampaignsByStatus(status as string);
      } else if (branchId) {
        campaigns = await storage.getMarketingCampaignsByBranch(branchId as string);
      } else {
        campaigns = await storage.getAllMarketingCampaigns();
      }
      
      res.json(campaigns);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/marketing-campaigns/:id", authenticate, authorize("admin"), async (req, res) => {
    try {
      const campaign = await storage.getMarketingCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/marketing-campaigns", authenticate, authorize("admin"), async (req, res) => {
    try {
      const campaign = await storage.createMarketingCampaign({
        ...req.body,
        createdBy: req.user!.id,
      });
      res.json(campaign);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/marketing-campaigns/:id", authenticate, authorize("admin"), async (req, res) => {
    try {
      const campaign = await storage.updateMarketingCampaign(req.params.id, req.body);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/marketing-campaigns/:id", authenticate, authorize("admin"), async (req, res) => {
    try {
      await storage.deleteMarketingCampaign(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get campaign recipients with filtering
  app.get("/api/marketing-campaigns/:id/recipients", authenticate, authorize("admin"), async (req, res) => {
    try {
      const { status } = req.query;
      
      let recipients;
      if (status) {
        recipients = await storage.getCampaignRecipientsByStatus(req.params.id, status as string);
      } else {
        recipients = await storage.getCampaignRecipients(req.params.id);
      }
      
      res.json(recipients);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Preview campaign audience - get count and sample customers
  app.post("/api/marketing-campaigns/preview-audience", authenticate, authorize("admin"), async (req, res) => {
    try {
      const { targetAudience, customSegmentFilter, branchId } = req.body;
      
      let customers: any[] = [];
      
      if (targetAudience === "all") {
        customers = await storage.getCustomersForSegment({ branchId });
      } else if (targetAudience === "loyal_customers") {
        customers = await storage.getCustomersForSegment({ 
          loyaltyTier: "gold",
          branchId 
        });
      } else if (targetAudience === "new_customers") {
        customers = await storage.getCustomersForSegment({ 
          maxOrders: 3,
          branchId 
        });
      } else if (targetAudience === "inactive_customers") {
        // Customers with no orders in last 30 days would need more complex query
        customers = await storage.getCustomersForSegment({ branchId });
      } else if (targetAudience === "custom" && customSegmentFilter) {
        customers = await storage.getCustomersForSegment(customSegmentFilter);
      }
      
      res.json({
        totalCount: customers.length,
        sampleCustomers: customers.slice(0, 10).map(c => ({
          id: c.id,
          fullName: c.fullName,
          phone: c.phone,
          email: c.email,
        }))
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Launch a campaign - create recipients and start sending
  app.post("/api/marketing-campaigns/:id/launch", authenticate, authorize("admin"), async (req, res) => {
    try {
      const campaign = await storage.getMarketingCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      
      if (campaign.status !== "draft" && campaign.status !== "scheduled") {
        return res.status(400).json({ error: "Campaign cannot be launched" });
      }
      
      // Get target customers
      let filters: any = { branchId: campaign.branchId };
      
      if (campaign.targetAudience === "loyal_customers") {
        filters.loyaltyTier = "gold";
      } else if (campaign.targetAudience === "new_customers") {
        filters.maxOrders = 3;
      } else if (campaign.targetAudience === "custom" && campaign.customSegmentFilter) {
        filters = campaign.customSegmentFilter;
      }
      
      const customers = await storage.getCustomersForSegment(filters);
      
      // Create recipients with personalized messages
      const recipients = customers
        .filter(c => c.phone) // Only customers with phone numbers
        .map(customer => {
          let personalizedMessage = campaign.messageTemplate;
          
          // Replace template variables
          const variables = campaign.templateVariables as any || {};
          personalizedMessage = personalizedMessage.replace(/\{\{name\}\}/g, customer.fullName || "Valued Customer");
          personalizedMessage = personalizedMessage.replace(/\{\{phone\}\}/g, customer.phone || "");
          
          Object.keys(variables).forEach(key => {
            const placeholder = `{{${key}}}`;
            personalizedMessage = personalizedMessage.replace(new RegExp(placeholder, 'g'), variables[key]);
          });
          
          return {
            campaignId: campaign.id,
            customerId: customer.id,
            phoneNumber: customer.phone!,
            personalizedMessage,
            status: "pending" as const,
          };
        });
      
      if (recipients.length === 0) {
        return res.status(400).json({ error: "No customers found matching campaign criteria" });
      }
      
      // Bulk create recipients
      await storage.bulkCreateCampaignRecipients(recipients);
      
      // Update campaign status and counts
      await storage.updateMarketingCampaign(campaign.id, {
        status: campaign.scheduledAt && new Date(campaign.scheduledAt) > new Date() ? "scheduled" : "sending",
        totalRecipients: recipients.length,
        startedAt: new Date(),
      });
      
      res.json({ 
        success: true, 
        recipientsCreated: recipients.length,
        message: "Campaign launched successfully. Messages will be sent via WhatsApp API."
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Message Templates Routes
  app.get("/api/message-templates", authenticate, authorize("admin"), async (req, res) => {
    try {
      const { category } = req.query;
      
      console.log(`[GET /api/message-templates] category=${category}, user=${req.user?.email}`);
      
      let templates;
      if (category) {
        templates = await storage.getMessageTemplatesByCategory(category as string);
      } else {
        templates = await storage.getAllMessageTemplates();
      }
      
      console.log(`[GET /api/message-templates] Returning ${templates.length} templates:`, templates.map(t => ({ id: t.id, name: t.name })));
      
      res.json(templates);
    } catch (error: any) {
      console.error(`[GET /api/message-templates] Error:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/message-templates/:id", authenticate, authorize("admin"), async (req, res) => {
    try {
      const template = await storage.getMessageTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/message-templates", authenticate, authorize("admin"), async (req, res) => {
    try {
      console.log(`[POST /api/message-templates] Creating template:`, req.body);
      const template = await storage.createMessageTemplate({
        ...req.body,
        createdBy: req.user!.id,
      });
      console.log(`[POST /api/message-templates] Created template:`, { id: template.id, name: template.name });
      res.json(template);
    } catch (error: any) {
      console.error(`[POST /api/message-templates] Error:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/message-templates/:id", authenticate, authorize("admin"), async (req, res) => {
    try {
      const template = await storage.updateMessageTemplate(req.params.id, req.body);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/message-templates/:id", authenticate, authorize("admin"), async (req, res) => {
    try {
      await storage.deleteMessageTemplate(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Customer Segments Routes
  app.get("/api/customer-segments", authenticate, authorize("admin"), async (req, res) => {
    try {
      const segments = await storage.getAllCustomerSegments();
      res.json(segments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/customer-segments/:id", authenticate, authorize("admin"), async (req, res) => {
    try {
      const segment = await storage.getCustomerSegment(req.params.id);
      if (!segment) {
        return res.status(404).json({ error: "Segment not found" });
      }
      res.json(segment);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/customer-segments", authenticate, authorize("admin"), async (req, res) => {
    try {
      const segment = await storage.createCustomerSegment({
        ...req.body,
        createdBy: req.user!.id,
      });
      
      // Calculate initial count
      await storage.calculateSegmentCustomerCount(segment.id);
      
      res.json(segment);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/customer-segments/:id", authenticate, authorize("admin"), async (req, res) => {
    try {
      const segment = await storage.updateCustomerSegment(req.params.id, req.body);
      if (!segment) {
        return res.status(404).json({ error: "Segment not found" });
      }
      
      // Recalculate count if filters changed
      if (req.body.filters) {
        await storage.calculateSegmentCustomerCount(req.params.id);
      }
      
      res.json(segment);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/customer-segments/:id", authenticate, authorize("admin"), async (req, res) => {
    try {
      await storage.deleteCustomerSegment(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Recalculate segment customer count
  app.post("/api/customer-segments/:id/recalculate", authenticate, authorize("admin"), async (req, res) => {
    try {
      const count = await storage.calculateSegmentCustomerCount(req.params.id);
      res.json({ count });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Seed production data (admin only, idempotent - can be re-run safely)
  app.post("/api/admin/seed-data", authenticate, authorize("admin"), async (req, res) => {
    try {
      const results: any = {
        branches: 0,
        branchesSkipped: 0,
        categories: 0,
        categoriesSkipped: 0,
        menuItems: 0,
        menuItemsSkipped: 0,
        staff: 0,
        staffSkipped: 0,
        riders: 0,
        ridersSkipped: 0,
        promos: 0,
        promosSkipped: 0,
        inventory: 0,
        tables: 0,
        tablesSkipped: 0,
        errors: []
      };

      // 1. Create Branches
      const branches = [
        {
          name: "Main Branch - Downtown",
          city: "Karachi",
          address: "123 Main Street, Downtown, Karachi",
          phone: "+92-321-1234567",
          isActive: true,
        },
        {
          name: "North Branch - Gulshan",
          city: "Karachi",
          address: "456 Gulshan Avenue, Gulshan-e-Iqbal, Karachi",
          phone: "+92-321-2345678",
          isActive: true,
        },
        {
          name: "South Branch - Clifton",
          city: "Karachi",
          address: "789 Clifton Road, Clifton Block 5, Karachi",
          phone: "+92-321-3456789",
          isActive: true,
        }
      ];

      const createdBranches: any[] = [];
      const allExistingBranches = await storage.getAllBranches();
      
      for (const branch of branches) {
        try {
          // Check if branch already exists by name
          const exists = allExistingBranches.find(b => b.name === branch.name);
          if (exists) {
            createdBranches.push(exists);
            results.branchesSkipped++;
          } else {
            const created = await storage.createBranch(branch);
            createdBranches.push(created);
            results.branches++;
          }
        } catch (e: any) {
          results.errors.push(`Branch "${branch.name}": ${e.message}`);
        }
      }

      if (createdBranches.length === 0) {
        throw new Error("Failed to create branches");
      }

      const mainBranch = createdBranches[0];

      // 2. Create Staff Users
      const staffUsers = [
        { username: "manager1", email: "manager@kebabish.com", password: "manager123", fullName: "Manager One", role: "staff", branchId: mainBranch.id },
        { username: "cashier1", email: "cashier1@kebabish.com", password: "cashier123", fullName: "Cashier One", role: "staff", branchId: mainBranch.id },
        { username: "kitchen1", email: "kitchen1@kebabish.com", password: "kitchen123", fullName: "Kitchen Staff", role: "staff", branchId: mainBranch.id },
      ];

      for (const user of staffUsers) {
        try {
          // Check if user already exists by email
          const exists = await storage.getUserByEmail(user.email);
          if (exists) {
            results.staffSkipped++;
          } else {
            const hashedPassword = await bcrypt.hash(user.password, 10);
            await storage.createUser({ ...user, password: hashedPassword });
            results.staff++;
          }
        } catch (e: any) {
          results.errors.push(`Staff "${user.email}": ${e.message}`);
        }
      }

      // 3. Create Categories
      const categories = [
        { name: "Pizzas", description: "Delicious handcrafted pizzas", displayOrder: 1, isActive: true },
        { name: "Burgers", description: "Juicy gourmet burgers", displayOrder: 2, isActive: true },
        { name: "Sides", description: "Perfect sides to complement your meal", displayOrder: 3, isActive: true },
        { name: "Beverages", description: "Refreshing drinks", displayOrder: 4, isActive: true },
        { name: "Desserts", description: "Sweet treats", displayOrder: 5, isActive: true },
      ];

      const createdCategories: any[] = [];
      const allExistingCategories = await storage.getAllCategories();
      
      for (const category of categories) {
        try {
          // Check if category already exists by name
          const exists = allExistingCategories.find(c => c.name === category.name);
          if (exists) {
            createdCategories.push(exists);
            results.categoriesSkipped++;
          } else {
            const created = await storage.createCategory(category);
            createdCategories.push(created);
            results.categories++;
          }
        } catch (e: any) {
          results.errors.push(`Category "${category.name}": ${e.message}`);
        }
      }

      // 4. Create Menu Items with Variants
      const pizzaCategory = createdCategories.find(c => c.name === "Pizzas");
      const burgerCategory = createdCategories.find(c => c.name === "Burgers");
      const sidesCategory = createdCategories.find(c => c.name === "Sides");
      const beveragesCategory = createdCategories.find(c => c.name === "Beverages");
      const dessertsCategory = createdCategories.find(c => c.name === "Desserts");

      const menuItems = [
        // Pizzas
        {
          name: "Margherita Pizza",
          description: "Classic tomato sauce, mozzarella, and basil",
          categoryId: pizzaCategory.id,
          price: "899",
          isAvailable: true,
          isVegetarian: true,
          variants: JSON.stringify([
            {
              id: "size",
              name: "Size",
              required: true,
              options: [
                { id: "small", name: "Small (10\")", priceModifier: "0" },
                { id: "medium", name: "Medium (12\")", priceModifier: "300" },
                { id: "large", name: "Large (14\")", priceModifier: "500" }
              ]
            },
            {
              id: "crust",
              name: "Crust",
              required: true,
              options: [
                { id: "thin", name: "Thin Crust", priceModifier: "0" },
                { id: "thick", name: "Thick Crust", priceModifier: "100" }
              ]
            }
          ])
        },
        {
          name: "Pepperoni Pizza",
          description: "Loaded with pepperoni and mozzarella",
          categoryId: pizzaCategory.id,
          price: "1199",
          isAvailable: true,
          isVegetarian: false,
          variants: JSON.stringify([
            {
              id: "size",
              name: "Size",
              required: true,
              options: [
                { id: "small", name: "Small (10\")", priceModifier: "0" },
                { id: "medium", name: "Medium (12\")", priceModifier: "300" },
                { id: "large", name: "Large (14\")", priceModifier: "500" }
              ]
            }
          ])
        },
        // Burgers
        {
          name: "Classic Beef Burger",
          description: "Juicy beef patty with lettuce, tomato, and special sauce",
          categoryId: burgerCategory.id,
          price: "599",
          isAvailable: true,
          isVegetarian: false,
          variants: JSON.stringify([
            {
              id: "size",
              name: "Size",
              required: true,
              options: [
                { id: "single", name: "Single Patty", priceModifier: "0" },
                { id: "double", name: "Double Patty", priceModifier: "200" }
              ]
            }
          ])
        },
        {
          name: "Chicken Burger",
          description: "Crispy chicken fillet with mayo and lettuce",
          categoryId: burgerCategory.id,
          price: "549",
          isAvailable: true,
          isVegetarian: false,
          variants: JSON.stringify([])
        },
        // Sides
        {
          name: "French Fries",
          description: "Crispy golden fries",
          categoryId: sidesCategory.id,
          price: "199",
          isAvailable: true,
          isVegetarian: true,
          variants: JSON.stringify([
            {
              id: "size",
              name: "Size",
              required: true,
              options: [
                { id: "regular", name: "Regular", priceModifier: "0" },
                { id: "large", name: "Large", priceModifier: "100" }
              ]
            }
          ])
        },
        {
          name: "Onion Rings",
          description: "Crispy battered onion rings",
          categoryId: sidesCategory.id,
          price: "249",
          isAvailable: true,
          isVegetarian: true,
          variants: JSON.stringify([])
        },
        // Beverages
        {
          name: "Soft Drink",
          description: "Coca-Cola, Sprite, or Fanta",
          categoryId: beveragesCategory.id,
          price: "99",
          isAvailable: true,
          isVegetarian: true,
          variants: JSON.stringify([
            {
              id: "size",
              name: "Size",
              required: true,
              options: [
                { id: "regular", name: "Regular", priceModifier: "0" },
                { id: "large", name: "Large", priceModifier: "50" }
              ]
            }
          ])
        },
        {
          name: "Fresh Juice",
          description: "Orange or Mango juice",
          categoryId: beveragesCategory.id,
          price: "199",
          isAvailable: true,
          isVegetarian: true,
          variants: JSON.stringify([])
        },
        // Desserts
        {
          name: "Chocolate Brownie",
          description: "Warm chocolate brownie with vanilla ice cream",
          categoryId: dessertsCategory.id,
          price: "299",
          isAvailable: true,
          isVegetarian: true,
          variants: JSON.stringify([])
        }
      ];

      const allExistingMenuItems = await storage.getAllMenuItems();
      
      for (const item of menuItems) {
        try {
          // Check if menu item already exists by name
          const exists = allExistingMenuItems.find(m => m.name === item.name);
          if (exists) {
            results.menuItemsSkipped++;
          } else {
            await storage.createMenuItem(item);
            results.menuItems++;
          }
        } catch (e: any) {
          results.errors.push(`Menu Item "${item.name}": ${e.message}`);
        }
      }

      // 5. Create Riders
      const riders = [
        {
          name: "Ahmed Khan",
          phone: "+92-300-1111111",
          vehicleNumber: "KHI-1234",
          vehicleType: "motorcycle",
          isActive: true,
          isAvailable: true,
          branchId: mainBranch.id,
          currentLatitude: "24.8607",
          currentLongitude: "67.0011"
        },
        {
          name: "Hassan Ali",
          phone: "+92-300-2222222",
          vehicleNumber: "KHI-5678",
          vehicleType: "motorcycle",
          isActive: true,
          isAvailable: true,
          branchId: mainBranch.id,
          currentLatitude: "24.8607",
          currentLongitude: "67.0011"
        }
      ];

      for (const rider of riders) {
        try {
          // Check if rider already exists by phone
          const exists = await storage.getRiderByPhone(rider.phone);
          if (exists) {
            results.ridersSkipped++;
          } else {
            await storage.createRider(rider);
            results.riders++;
          }
        } catch (e: any) {
          results.errors.push(`Rider "${rider.name}": ${e.message}`);
        }
      }

      // 6. Create Promotional Codes
      const promos = [
        {
          code: "WELCOME10",
          description: "Welcome discount - 10% off",
          discountType: "percentage",
          discountValue: "10",
          minOrderAmount: "500",
          maxDiscountAmount: "200",
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          usageLimit: 1000,
          usedCount: 0,
          isActive: true
        },
        {
          code: "SAVE200",
          description: "Flat 200 PKR off on orders above 1500",
          discountType: "fixed",
          discountValue: "200",
          minOrderAmount: "1500",
          maxDiscountAmount: "200",
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          usageLimit: 500,
          usedCount: 0,
          isActive: true
        }
      ];

      const allExistingPromos = await storage.getAllPromoCodes();
      
      for (const promo of promos) {
        try {
          // Check if promo code already exists by code
          const exists = allExistingPromos.find(p => p.code === promo.code);
          if (exists) {
            results.promosSkipped++;
          } else {
            await storage.createPromoCode(promo);
            results.promos++;
          }
        } catch (e: any) {
          results.errors.push(`Promo "${promo.code}": ${e.message}`);
        }
      }

      // 7. Create POS Tables for dine-in
      const tables = [
        { tableName: "Table 1", tableNumber: 1, capacity: 2, status: "available", branchId: mainBranch.id },
        { tableName: "Table 2", tableNumber: 2, capacity: 4, status: "available", branchId: mainBranch.id },
        { tableName: "Table 3", tableNumber: 3, capacity: 4, status: "available", branchId: mainBranch.id },
        { tableName: "Table 4", tableNumber: 4, capacity: 6, status: "available", branchId: mainBranch.id },
        { tableName: "Table 5", tableNumber: 5, capacity: 8, status: "available", branchId: mainBranch.id },
      ];

      const allExistingTables = await storage.getPosTablesByBranch(mainBranch.id);
      
      for (const table of tables) {
        try {
          // Check if table already exists by table number
          const exists = allExistingTables.find(t => t.tableNumber === table.tableNumber);
          if (exists) {
            results.tablesSkipped++;
          } else {
            await storage.createPosTable(table);
            results.tables++;
          }
        } catch (e: any) {
          results.errors.push(`Table ${table.tableNumber}: ${e.message}`);
        }
      }

      res.json({
        success: true,
        message: "Production data seeded successfully",
        results
      });
    } catch (error: any) {
      console.error("Seeding error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get clone diagnostics
  app.get("/api/admin/clone-diagnostics", authenticate, authorize("admin"), async (req, res) => {
    try {
      // Get development database stats
      const devBranches = await storage.getAllBranches();
      const devCategories = await storage.getAllCategories();
      const devMenuItems = await storage.getAllMenuItems();
      const devOrders = await storage.getAllOrders();
      const devRiders = await storage.getAllRiders();
      const allUsers = await storage.getAllUsers();
      const devCustomers = allUsers.filter(u => u.role === "customer");

      // For production stats, we'd need to connect to production DB
      // For now, we'll use the same dev stats as a placeholder
      // In real implementation, you'd connect to PRODUCTION_DATABASE_URL
      const prodBranches = devBranches; // TODO: Get from production
      const prodCategories = devCategories;
      const prodMenuItems = devMenuItems;
      const prodOrders = devOrders;
      const prodRiders = devRiders;
      const prodCustomers = devCustomers;

      const pendingOrders = prodOrders.filter(o => 
        o.status === "pending" || o.status === "confirmed" || o.status === "preparing"
      ).length;

      const canClone = pendingOrders === 0;
      const blockingReasons = [];
      if (pendingOrders > 0) {
        blockingReasons.push(`${pendingOrders} pending orders in production. Complete or cancel them first.`);
      }

      res.json({
        development: {
          branches: devBranches.length,
          categories: devCategories.length,
          menuItems: devMenuItems.length,
          orders: devOrders.length,
          customers: devCustomers.length,
          users: allUsers.length,
          riders: devRiders.length,
          totalRecords: devBranches.length + devCategories.length + devMenuItems.length + 
            devOrders.length + devCustomers.length + allUsers.length + devRiders.length
        },
        production: {
          branches: prodBranches.length,
          categories: prodCategories.length,
          menuItems: prodMenuItems.length,
          orders: prodOrders.length,
          customers: prodCustomers.length,
          users: allUsers.length,
          riders: prodRiders.length,
          totalRecords: prodBranches.length + prodCategories.length + prodMenuItems.length + 
            prodOrders.length + prodCustomers.length + allUsers.length + prodRiders.length,
          pendingOrders,
          lastBackup: null // TODO: Track backup timestamp
        },
        canClone,
        blockingReasons
      });
    } catch (error: any) {
      console.error("Error getting clone diagnostics:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Clone development to production
  app.post("/api/admin/clone-to-production", authenticate, authorize("admin"), async (req, res) => {
    try {
      const { confirmationText, prodDbUrl } = req.body;

      // Validate confirmation text
      if (confirmationText !== "CLONE ALL DATA") {
        return res.status(400).json({ error: "Invalid confirmation text" });
      }

      // Validate production DB URL
      if (!prodDbUrl || !prodDbUrl.includes("postgres")) {
        return res.status(400).json({ error: "Invalid production database URL" });
      }

      // Check for blocking conditions
      const allOrders = await storage.getAllOrders();
      const pendingOrders = allOrders.filter(o => 
        o.status === "pending" || o.status === "confirmed" || o.status === "preparing"
      );
      
      if (pendingOrders.length > 0) {
        return res.status(400).json({ 
          error: `Cannot clone: ${pendingOrders.length} pending orders in production` 
        });
      }

      // In a real implementation, this would:
      // 1. Create a backup of production using pg_dump
      // 2. Use pg_dump to export development database
      // 3. Use pg_restore to import into production
      // 4. All within a transaction with deferred foreign keys
      // 5. Stream progress via WebSocket

      // For now, return a simulated success
      // TODO: Implement actual pg_dump/pg_restore logic
      
      res.json({
        success: true,
        message: "Database clone completed successfully (SIMULATED - implement pg_dump/pg_restore for production)",
        timestamp: new Date().toISOString(),
        performedBy: req.user?.username
      });

    } catch (error: any) {
      console.error("Error cloning to production:", error);
      res.status(500).json({ 
        success: false,
        error: error.message,
        rollback: true
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

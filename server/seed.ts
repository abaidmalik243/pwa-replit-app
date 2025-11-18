import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import * as schema from "@shared/schema";
import bcrypt from "bcrypt";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const db = drizzle(pool, { schema });

async function seed() {
  console.log("🌱 Starting database seed...");

  try {
    // Create branches with delivery areas
    console.log("Creating branches...");
    const okara = await db.insert(schema.branches).values({
      name: "Kebabish Pizza Okara",
      city: "Okara",
      address: "Main Bazaar, Okara",
      phone: "+92-300-1234567",
      latitude: "30.8081",  // Okara city center coordinates
      longitude: "73.4534",
      deliveryAreas: ["City Center", "Model Town", "Satellite Town", "Sadar Bazaar", "Civil Lines"],
      isActive: true,
    }).returning().then(rows => rows[0]);

    const sahiwal = await db.insert(schema.branches).values({
      name: "Kebabish Pizza Sahiwal",
      city: "Sahiwal",
      address: "Main Boulevard, Sahiwal",
      phone: "+92-300-1234568",
      latitude: "30.6708",  // Sahiwal city center coordinates
      longitude: "73.1116",
      deliveryAreas: ["Farid Town", "Allama Iqbal Colony", "Civil Lines", "High Street", "Jinnah Colony"],
      isActive: true,
    }).returning().then(rows => rows[0]);

    const faisalabad = await db.insert(schema.branches).values({
      name: "Kebabish Pizza Faisalabad",
      city: "Faisalabad",
      address: "D-Ground, Faisalabad",
      phone: "+92-300-1234569",
      latitude: "31.4180",  // Faisalabad D-Ground coordinates
      longitude: "73.0790",
      deliveryAreas: ["D-Ground", "Peoples Colony", "Susan Road", "Madina Town", "Gulberg"],
      isActive: true,
    }).returning().then(rows => rows[0]);

    // Create default admin account
    console.log("Creating default admin account...");
    const hashedPassword = await bcrypt.hash("Abcd@1234", 10);
    await db.insert(schema.users).values({
      username: "abaidmalik",
      email: "abaidmalik243@gmail.com",
      password: hashedPassword,
      fullName: "Admin User",
      phone: "+92-300-1234567",
      role: "admin",
      permissions: [
        "manage_menu",
        "manage_orders",
        "manage_users",
        "manage_branches",
        "view_reports",
        "manage_expenses",
        "manage_settings",
        "manage_stock",
      ],
      isActive: true,
    });

    // Create categories
    console.log("Creating categories...");
    const pizzaCat = await db.insert(schema.categories).values({
      name: "Pizzas",
      description: "Delicious pizzas in various sizes and flavors",
      isActive: true,
    }).returning().then(rows => rows[0]);

    const friesCat = await db.insert(schema.categories).values({
      name: "French Fries",
      description: "Crispy golden fries",
      isActive: true,
    }).returning().then(rows => rows[0]);

    const burgersCat = await db.insert(schema.categories).values({
      name: "Burgers",
      description: "Juicy burgers",
      isActive: true,
    }).returning().then(rows => rows[0]);

    const wingsCat = await db.insert(schema.categories).values({
      name: "Wings",
      description: "Oven baked and hot wings",
      isActive: true,
    }).returning().then(rows => rows[0]);

    const pastaCat = await db.insert(schema.categories).values({
      name: "Pasta",
      description: "Delicious pasta in different flavors",
      isActive: true,
    }).returning().then(rows => rows[0]);

    // Pizza menu items
    console.log("Creating menu items - Pizzas...");
    const pizzaTypes = [
      "Chicken Tikka",
      "Chicken Fajita",
      "Chicken Supreme",
      "Veg Lover",
      "Chicken Malai Boti",
      "Kebabish Special",
    ];

    // Regular Pizzas (Small, Medium, Large)
    for (const pizzaType of pizzaTypes) {
      await db.insert(schema.menuItems).values([
        {
          name: `${pizzaType} Pizza`,
          description: `Delicious ${pizzaType} pizza`,
          price: "450",
          size: "Small",
          variant: "Regular",
          categoryId: pizzaCat.id,
          isAvailable: true,
          isHotSelling: ["Chicken Tikka", "Kebabish Special"].includes(pizzaType),
          stockQuantity: 100,
          lowStockThreshold: 10,
        },
        {
          name: `${pizzaType} Pizza`,
          description: `Delicious ${pizzaType} pizza`,
          price: "850",
          size: "Medium",
          variant: "Regular",
          categoryId: pizzaCat.id,
          isAvailable: true,
          isHotSelling: ["Chicken Tikka", "Kebabish Special"].includes(pizzaType),
          stockQuantity: 100,
          lowStockThreshold: 10,
        },
        {
          name: `${pizzaType} Pizza`,
          description: `Delicious ${pizzaType} pizza`,
          price: "1180",
          size: "Large",
          variant: "Regular",
          categoryId: pizzaCat.id,
          isAvailable: true,
          isHotSelling: ["Chicken Tikka", "Kebabish Special"].includes(pizzaType),
          stockQuantity: 100,
          lowStockThreshold: 10,
        },
      ]);
    }

    // Special Treat Pizzas
    await db.insert(schema.menuItems).values([
      {
        name: "Kabab Stuffer Pizza",
        description: "Delicious kabab stuffed pizza",
        price: "1150",
        size: "Medium",
        variant: "Special Treat",
        categoryId: pizzaCat.id,
        isAvailable: true,
        isHotSelling: true,
        stockQuantity: 50,
        lowStockThreshold: 5,
      },
      {
        name: "Kabab Stuffer Pizza",
        description: "Delicious kabab stuffed pizza",
        price: "1480",
        size: "Large",
        variant: "Special Treat",
        categoryId: pizzaCat.id,
        isAvailable: true,
        isHotSelling: true,
        stockQuantity: 50,
        lowStockThreshold: 5,
      },
      {
        name: "Cheese Stuffer Pizza",
        description: "Extra cheese stuffed pizza",
        price: "1150",
        size: "Medium",
        variant: "Special Treat",
        categoryId: pizzaCat.id,
        isAvailable: true,
        isHotSelling: false,
        stockQuantity: 50,
        lowStockThreshold: 5,
      },
      {
        name: "Cheese Stuffer Pizza",
        description: "Extra cheese stuffed pizza",
        price: "1480",
        size: "Large",
        variant: "Special Treat",
        categoryId: pizzaCat.id,
        isAvailable: true,
        isHotSelling: false,
        stockQuantity: 50,
        lowStockThreshold: 5,
      },
    ]);

    // Bihari Kabab & Pepperoni
    await db.insert(schema.menuItems).values([
      {
        name: "Bihari Kabab Pizza",
        description: "Traditional Bihari kabab pizza",
        price: "980",
        size: "Medium",
        variant: "Premium",
        categoryId: pizzaCat.id,
        isAvailable: true,
        isHotSelling: true,
        stockQuantity: 60,
        lowStockThreshold: 8,
      },
      {
        name: "Bihari Kabab Pizza",
        description: "Traditional Bihari kabab pizza",
        price: "1380",
        size: "Large",
        variant: "Premium",
        categoryId: pizzaCat.id,
        isAvailable: true,
        isHotSelling: true,
        stockQuantity: 60,
        lowStockThreshold: 8,
      },
      {
        name: "Pepperoni Pizza",
        description: "Classic pepperoni pizza",
        price: "980",
        size: "Medium",
        variant: "Premium",
        categoryId: pizzaCat.id,
        isAvailable: true,
        isHotSelling: false,
        stockQuantity: 60,
        lowStockThreshold: 8,
      },
      {
        name: "Pepperoni Pizza",
        description: "Classic pepperoni pizza",
        price: "1380",
        size: "Large",
        variant: "Premium",
        categoryId: pizzaCat.id,
        isAvailable: true,
        isHotSelling: false,
        stockQuantity: 60,
        lowStockThreshold: 8,
      },
    ]);

    // Square Pizzas
    for (const pizzaType of pizzaTypes) {
      await db.insert(schema.menuItems).values([
        {
          name: `${pizzaType} Pizza`,
          description: `Square ${pizzaType} pizza`,
          price: "950",
          size: "Medium",
          variant: "Square",
          categoryId: pizzaCat.id,
          isAvailable: true,
          isHotSelling: false,
          stockQuantity: 40,
          lowStockThreshold: 5,
        },
        {
          name: `${pizzaType} Pizza`,
          description: `Square ${pizzaType} pizza`,
          price: "1280",
          size: "Large",
          variant: "Square",
          categoryId: pizzaCat.id,
          isAvailable: true,
          isHotSelling: false,
          stockQuantity: 40,
          lowStockThreshold: 5,
        },
      ]);
    }

    // Square Stuffer
    await db.insert(schema.menuItems).values({
      name: "Kabab Stuffer Pizza",
      description: "Square kabab stuffer pizza",
      price: "1550",
      size: "Large",
      variant: "Square Stuffer",
      categoryId: pizzaCat.id,
      isAvailable: true,
      isHotSelling: true,
      stockQuantity: 30,
      lowStockThreshold: 5,
    });

    // French Fries
    console.log("Creating menu items - French Fries...");
    await db.insert(schema.menuItems).values([
      {
        name: "Regular Fries",
        description: "Crispy golden french fries",
        price: "180",
        size: "Regular",
        variant: null,
        categoryId: friesCat.id,
        isAvailable: true,
        isHotSelling: true,
        stockQuantity: 200,
        lowStockThreshold: 20,
      },
      {
        name: "Family Pack Fries",
        description: "Large family pack of crispy fries",
        price: "350",
        size: "Family",
        variant: null,
        categoryId: friesCat.id,
        isAvailable: true,
        isHotSelling: false,
        stockQuantity: 150,
        lowStockThreshold: 15,
      },
    ]);

    // Burgers
    console.log("Creating menu items - Burgers...");
    await db.insert(schema.menuItems).values([
      {
        name: "Zinger Burger",
        description: "Crispy zinger burger",
        price: "330",
        size: null,
        variant: null,
        categoryId: burgersCat.id,
        isAvailable: true,
        isHotSelling: true,
        stockQuantity: 80,
        lowStockThreshold: 10,
      },
      {
        name: "Fish Burger",
        description: "Delicious fish burger (Coming Soon)",
        price: "480",
        size: null,
        variant: null,
        categoryId: burgersCat.id,
        isAvailable: false,
        isHotSelling: false,
        stockQuantity: 0,
        lowStockThreshold: 0,
      },
    ]);

    // Wings
    console.log("Creating menu items - Wings...");
    await db.insert(schema.menuItems).values([
      {
        name: "Oven Baked Wings",
        description: "Crispy oven baked wings",
        price: "250",
        size: "5 Pieces",
        variant: "Oven Baked",
        categoryId: wingsCat.id,
        isAvailable: true,
        isHotSelling: true,
        stockQuantity: 120,
        lowStockThreshold: 15,
      },
      {
        name: "Oven Baked Wings",
        description: "Crispy oven baked wings",
        price: "450",
        size: "10 Pieces",
        variant: "Oven Baked",
        categoryId: wingsCat.id,
        isAvailable: true,
        isHotSelling: true,
        stockQuantity: 120,
        lowStockThreshold: 15,
      },
      {
        name: "Hot Wings",
        description: "Spicy hot wings",
        price: "290",
        size: "5 Pieces",
        variant: "Hot",
        categoryId: wingsCat.id,
        isAvailable: true,
        isHotSelling: false,
        stockQuantity: 100,
        lowStockThreshold: 12,
      },
      {
        name: "Hot Wings",
        description: "Spicy hot wings",
        price: "550",
        size: "10 Pieces",
        variant: "Hot",
        categoryId: wingsCat.id,
        isAvailable: true,
        isHotSelling: false,
        stockQuantity: 100,
        lowStockThreshold: 12,
      },
    ]);

    // Pasta
    console.log("Creating menu items - Pasta...");
    await db.insert(schema.menuItems).values([
      {
        name: "Special Pasta",
        description: "Our special pasta",
        price: "350",
        size: "F-1",
        variant: "Special",
        categoryId: pastaCat.id,
        isAvailable: true,
        isHotSelling: false,
        stockQuantity: 70,
        lowStockThreshold: 10,
      },
      {
        name: "Special Pasta",
        description: "Our special pasta",
        price: "550",
        size: "F-2",
        variant: "Special",
        categoryId: pastaCat.id,
        isAvailable: true,
        isHotSelling: false,
        stockQuantity: 70,
        lowStockThreshold: 10,
      },
      {
        name: "BBQ Pasta",
        description: "BBQ flavored pasta",
        price: "400",
        size: "F-1",
        variant: "BBQ",
        categoryId: pastaCat.id,
        isAvailable: true,
        isHotSelling: true,
        stockQuantity: 60,
        lowStockThreshold: 8,
      },
      {
        name: "BBQ Pasta",
        description: "BBQ flavored pasta",
        price: "600",
        size: "F-2",
        variant: "BBQ",
        categoryId: pastaCat.id,
        isAvailable: true,
        isHotSelling: true,
        stockQuantity: 60,
        lowStockThreshold: 8,
      },
      {
        name: "Crunchy Pasta",
        description: "Crunchy crispy pasta",
        price: "450",
        size: "F-1",
        variant: "Crunchy",
        categoryId: pastaCat.id,
        isAvailable: true,
        isHotSelling: false,
        stockQuantity: 55,
        lowStockThreshold: 8,
      },
      {
        name: "Crunchy Pasta",
        description: "Crunchy crispy pasta",
        price: "650",
        size: "F-2",
        variant: "Crunchy",
        categoryId: pastaCat.id,
        isAvailable: true,
        isHotSelling: false,
        stockQuantity: 55,
        lowStockThreshold: 8,
      },
    ]);

    console.log("✅ Database seeded successfully!");
    console.log(`
    📊 Seed Summary:
    - Branches: 3 (Okara, Sahiwal, Faisalabad)
    - Admin Account: abaidmalik243@gmail.com / Abcd@1234
    - Categories: 5 (Pizzas, Fries, Burgers, Wings, Pasta)
    - Menu Items: 70+ items with variants and sizes
    `);

  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

seed();

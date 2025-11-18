import * as schema from "@shared/schema";
import bcrypt from "bcrypt";
import { db, pool } from "./db";
async function seedMenuData() {
  console.log("🌱 Seeding menu data...");
  try {
    // Clear existing menu items and categories (in correct order to avoid FK conflicts)
    console.log("Clearing existing menu data...");
    await db.delete(schema.menuItems);
    await db.delete(schema.categories);
    console.log("✅ Cleared existing menu data");
    // Create Categories
    const categoriesData = [
      {
        name: "Pizzas",
        description: "Delicious handcrafted pizzas with premium toppings",
        imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop",
        isActive: true,
      },
      {
        name: "French Fries",
        description: "Crispy golden fries",
        imageUrl: "https://images.unsplash.com/photo-1630431341973-02e1979c5501?w=400&h=300&fit=crop",
        isActive: true,
      },
      {
        name: "Burgers",
        description: "Juicy burgers with fresh ingredients",
        imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop",
        isActive: true,
      },
      {
        name: "Wings",
        description: "Crispy chicken wings with various flavors",
        imageUrl: "https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=400&h=300&fit=crop",
        isActive: true,
      },
      {
        name: "Pasta",
        description: "Italian-style pasta dishes",
        imageUrl: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop",
        isActive: true,
      },
    ];
    const createdCategories = await db.insert(schema.categories).values(categoriesData).returning();
    console.log(`✅ Created ${createdCategories.length} categories`);
    const pizzaCategoryId = createdCategories.find((c: schema.Category) => c.name === "Pizzas")!.id;
    const friesCategoryId = createdCategories.find((c: schema.Category) => c.name === "French Fries")!.id;
    const burgersCategoryId = createdCategories.find((c: schema.Category) => c.name === "Burgers")!.id;
    const wingsCategoryId = createdCategories.find((c: schema.Category) => c.name === "Wings")!.id;
    const pastaCategoryId = createdCategories.find((c: schema.Category) => c.name === "Pasta")!.id;
    // Menu Items
    const menuItemsData: schema.InsertMenuItem[] = [];
    // Regular Pizzas (Small, Medium, Large)
    const regularPizzas = [
      "Chicken Tikka",
      "Chicken Fajita",
      "Chicken Supreme",
      "Veg Lover",
      "Chicken Malai Boti",
      "Kebabish Special",
    ];
    for (const pizza of regularPizzas) {
      menuItemsData.push(
        {
          name: `${pizza} Pizza - Small`,
          description: `Delicious ${pizza} pizza`,
          price: "450",
          categoryId: pizzaCategoryId,
          imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop",
          isAvailable: true,
        },
        {
          name: `${pizza} Pizza - Medium`,
          description: `Delicious ${pizza} pizza`,
          price: "850",
          categoryId: pizzaCategoryId,
          imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop",
          isAvailable: true,
        },
        {
          name: `${pizza} Pizza - Large`,
          description: `Delicious ${pizza} pizza`,
          price: "1180",
          categoryId: pizzaCategoryId,
          imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop",
          isAvailable: true,
        }
      );
    }
    // Special Treat Pizzas - Kabab and Cheese Stuffer
    menuItemsData.push(
      {
        name: "Kabab Stuffer Pizza - Medium",
        description: "Special treat pizza stuffed with kebab",
        price: "1180",
        categoryId: pizzaCategoryId,
        imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop",
        isAvailable: true,
      },
      {
        name: "Kabab Stuffer Pizza - Large",
        description: "Special treat pizza stuffed with kebab",
        price: "1480",
        categoryId: pizzaCategoryId,
        imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop",
        isAvailable: true,
      },
      {
        name: "Cheese Stuffer Pizza - Medium",
        description: "Special treat pizza stuffed with cheese",
        price: "1180",
        categoryId: pizzaCategoryId,
        imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop",
        isAvailable: true,
      },
      {
        name: "Cheese Stuffer Pizza - Large",
        description: "Special treat pizza stuffed with cheese",
        price: "1480",
        categoryId: pizzaCategoryId,
        imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop",
        isAvailable: true,
      }
    );
    // Special Treat Pizzas - Bihari Kabab and Pepperoni
    menuItemsData.push(
      {
        name: "Bihari Kabab Pizza - Medium",
        description: "Special treat pizza with Bihari kabab",
        price: "980",
        categoryId: pizzaCategoryId,
        imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop",
        isAvailable: true,
      },
      {
        name: "Bihari Kabab Pizza - Large",
        description: "Special treat pizza with Bihari kabab",
        price: "1380",
        categoryId: pizzaCategoryId,
        imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop",
        isAvailable: true,
      },
      {
        name: "Pepperoni Pizza - Medium",
        description: "Classic pepperoni pizza",
        price: "980",
        categoryId: pizzaCategoryId,
        imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop",
        isAvailable: true,
      },
      {
        name: "Pepperoni Pizza - Large",
        description: "Classic pepperoni pizza",
        price: "1380",
        categoryId: pizzaCategoryId,
        imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop",
        isAvailable: true,
      }
    );
    // Square Pizzas
    for (const pizza of regularPizzas) {
      menuItemsData.push(
        {
          name: `${pizza} Square Pizza - Medium`,
          description: `Square ${pizza} pizza`,
          price: "950",
          categoryId: pizzaCategoryId,
          imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop",
          isAvailable: true,
        },
        {
          name: `${pizza} Square Pizza - Large`,
          description: `Square ${pizza} pizza`,
          price: "1280",
          categoryId: pizzaCategoryId,
          imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop",
          isAvailable: true,
        }
      );
    }
    // Square Stuffer Pizza
    menuItemsData.push({
      name: "Kabab Stuffer Square Pizza",
      description: "Square pizza stuffed with kebab",
      price: "1550",
      categoryId: pizzaCategoryId,
      imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop",
      isAvailable: true,
    });
    // French Fries
    menuItemsData.push(
      {
        name: "Regular Fries",
        description: "Crispy golden french fries",
        price: "180",
        categoryId: friesCategoryId,
        imageUrl: "https://images.unsplash.com/photo-1630431341973-02e1979c5501?w=400&h=300&fit=crop",
        isAvailable: true,
      },
      {
        name: "Family Pack Fries",
        description: "Large family pack of crispy fries",
        price: "350",
        categoryId: friesCategoryId,
        imageUrl: "https://images.unsplash.com/photo-1630431341973-02e1979c5501?w=400&h=300&fit=crop",
        isAvailable: true,
      }
    );
    // Burgers
    menuItemsData.push({
      name: "Zinger Burger",
      description: "Crispy chicken zinger burger",
      price: "330",
      categoryId: burgersCategoryId,
      imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop",
      isAvailable: true,
    });
    // Wings
    menuItemsData.push(
      {
        name: "Oven Baked Wings - 5 Pieces",
        description: "Delicious oven baked chicken wings",
        price: "250",
        categoryId: wingsCategoryId,
        imageUrl: "https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=400&h=300&fit=crop",
        isAvailable: true,
      },
      {
        name: "Oven Baked Wings - 10 Pieces",
        description: "Delicious oven baked chicken wings",
        price: "450",
        categoryId: wingsCategoryId,
        imageUrl: "https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=400&h=300&fit=crop",
        isAvailable: true,
      },
      {
        name: "Hot Wings - 5 Pieces",
        description: "Spicy hot chicken wings",
        price: "290",
        categoryId: wingsCategoryId,
        imageUrl: "https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=400&h=300&fit=crop",
        isAvailable: true,
      },
      {
        name: "Hot Wings - 10 Pieces",
        description: "Spicy hot chicken wings",
        price: "550",
        categoryId: wingsCategoryId,
        imageUrl: "https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=400&h=300&fit=crop",
        isAvailable: true,
      }
    );
    // Pasta
    menuItemsData.push(
      {
        name: "Special Pasta - F-1",
        description: "Special pasta",
        price: "350",
        categoryId: pastaCategoryId,
        imageUrl: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop",
        isAvailable: true,
      },
      {
        name: "Special Pasta - F-2",
        description: "Special pasta (Large)",
        price: "550",
        categoryId: pastaCategoryId,
        imageUrl: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop",
        isAvailable: true,
      },
      {
        name: "BBQ Pasta - F-1",
        description: "BBQ pasta",
        price: "400",
        categoryId: pastaCategoryId,
        imageUrl: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop",
        isAvailable: true,
      },
      {
        name: "BBQ Pasta - F-2",
        description: "BBQ pasta (Large)",
        price: "600",
        categoryId: pastaCategoryId,
        imageUrl: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop",
        isAvailable: true,
      },
      {
        name: "Crunchy Pasta - F-1",
        description: "Crunchy pasta",
        price: "450",
        categoryId: pastaCategoryId,
        imageUrl: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop",
        isAvailable: true,
      },
      {
        name: "Crunchy Pasta - F-2",
        description: "Crunchy pasta (Large)",
        price: "650",
        categoryId: pastaCategoryId,
        imageUrl: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop",
        isAvailable: true,
      }
    );
    // Insert all menu items
    const createdMenuItems = await db.insert(schema.menuItems).values(menuItemsData).returning();
    console.log(`✅ Created ${createdMenuItems.length} menu items`);
    console.log("🎉 Menu seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding menu:", error);
    throw error;
  }
}
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

    // Create categories and menu items
    await seedMenuData();

    console.log("✅ Database seeded successfully!");
    console.log(`
    📊 Seed Summary:
    - Branches: 3 (Okara, Sahiwal, Faisalabad)
    - Admin Account: abaidmalik243@gmail.com / Abcd@1234
    - Categories: 5 (Pizzas, Fries, Burgers, Wings, Pasta)
    - Menu Items: 65 items with variants and sizes
    `);

  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

seed();

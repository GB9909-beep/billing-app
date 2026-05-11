/**
 * Seed Script - Run once to create default admin user and sample products
 * Usage: node seed.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const Product = require("./models/Product");

const MONGODB_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/anushree-billing";

// Default admin credentials
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "anushree@123";

// Sample construction products
const SAMPLE_PRODUCTS = [
  { name: "Cement (50kg bag)", hsn: "2523", rate: 380 },
  { name: "TMT Steel Bar (per kg)", hsn: "7214", rate: 65 },
  { name: "Sand (per brass)", hsn: "2505", rate: 4500 },
  { name: "Bricks (per 1000)", hsn: "6901", rate: 7000 },
  { name: "Concrete Mix", hsn: "3824", rate: 5500 },
  { name: "PVC Pipe (per ft)", hsn: "3917", rate: 45 },
  { name: "Electrical Wire (per meter)", hsn: "8544", rate: 25 },
  { name: "Paint (per litre)", hsn: "3209", rate: 350 },
  { name: "Tiles (per sq ft)", hsn: "6908", rate: 55 },
  { name: "Plywood (per sq ft)", hsn: "4412", rate: 85 },
  { name: "MS Angle (per kg)", hsn: "7216", rate: 70 },
  { name: "Binding Wire (per kg)", hsn: "7217", rate: 80 },
  { name: "Waterproofing Chemical (per litre)", hsn: "3214", rate: 250 },
  { name: "Gravel / Aggregate (per brass)", hsn: "2517", rate: 3500 },
  { name: "Ready Mix Concrete (per cubic meter)", hsn: "3824", rate: 6500 },
];

async function seed() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB!\n");

    // ===== Create Admin User =====
    const existingUser = await User.findOne({ username: ADMIN_USERNAME });
    if (existingUser) {
      console.log(
        `👤 Admin user "${ADMIN_USERNAME}" already exists. Skipping.`,
      );
    } else {
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
      await User.create({
        username: ADMIN_USERNAME,
        password: hashedPassword,
      });
      console.log(`👤 Admin user created:`);
      console.log(`   Username: ${ADMIN_USERNAME}`);
      console.log(`   Password: ${ADMIN_PASSWORD}`);
    }

    // ===== Create Sample Products =====
    const existingProducts = await Product.countDocuments();
    if (existingProducts > 0) {
      console.log(
        `\n📦 ${existingProducts} products already exist. Skipping seed.`,
      );
    } else {
      await Product.insertMany(SAMPLE_PRODUCTS);
      console.log(`\n📦 ${SAMPLE_PRODUCTS.length} sample products created:`);
      SAMPLE_PRODUCTS.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.name} (HSN: ${p.hsn}, Rate: ₹${p.rate})`);
      });
    }

    console.log("\n✅ Seed complete! You can now run: node server.js\n");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error.message);
    process.exit(1);
  }
}

seed();

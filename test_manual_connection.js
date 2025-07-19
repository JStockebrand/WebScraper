import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

async function testManualConnection() {
  console.log("Testing manual Supabase connection...");
  
  // Since the DATABASE_URL environment variable is being overridden by Replit's PostgreSQL module,
  // let's test if we can connect manually with the correct format
  
  console.log("Current environment DATABASE_URL:", process.env.DATABASE_URL?.substring(0, 30) + "...");
  
  // Ask user to provide the connection string directly for testing
  console.log("");
  console.log("🔧 SETUP REQUIRED:");
  console.log("The Replit PostgreSQL module is overriding the DATABASE_URL environment variable.");
  console.log("To test the Supabase connection, please:");
  console.log("");
  console.log("1. Go to your Supabase project dashboard");
  console.log("2. Click 'Connect' button");
  console.log("3. Select 'Connection string' tab");
  console.log("4. Choose 'Transaction pooler'");
  console.log("5. Copy the connection string that looks like:");
  console.log("   postgresql://postgres.xxx:[PASSWORD]@aws-0-region.pooler.supabase.com:6543/postgres");
  console.log("");
  console.log("Then I can modify the storage.ts file to use this connection string directly.");
  console.log("");
  
  // Test if we can at least connect to the Replit PostgreSQL database
  try {
    console.log("Testing current Replit PostgreSQL connection...");
    const sql = postgres(process.env.DATABASE_URL);
    const result = await sql`SELECT version()`;
    console.log("✅ Replit PostgreSQL is working:", result[0].version.substring(0, 50) + "...");
    await sql.end();
  } catch (error) {
    console.log("❌ Current database connection failed:", error.message);
  }
}

testManualConnection();
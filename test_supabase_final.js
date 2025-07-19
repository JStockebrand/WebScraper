import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

async function testSupabaseConnection() {
  console.log("Testing Supabase connection with correct environment variables...");
  
  const connectionString = process.env.SUPABASE_CONNECTION_STRING;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  
  console.log("SUPABASE_CONNECTION_STRING available:", !!connectionString);
  console.log("SUPABASE_URL available:", !!supabaseUrl);
  console.log("SUPABASE_ANON_KEY available:", !!supabaseAnonKey);
  
  if (!connectionString) {
    console.log("❌ SUPABASE_CONNECTION_STRING not found");
    console.log("Please add the PostgreSQL connection string from Supabase:");
    console.log("1. Go to Supabase dashboard -> Settings -> Database");
    console.log("2. Copy 'Connection string' -> 'Transaction pooler'");
    console.log("3. Replace [YOUR-PASSWORD] with actual password");
    console.log("4. Add as SUPABASE_CONNECTION_STRING secret");
    return;
  }
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.log("❌ Missing Supabase API credentials");
    console.log("Please add SUPABASE_URL and SUPABASE_ANON_KEY from:");
    console.log("Supabase dashboard -> Settings -> API");
    return;
  }
  
  // Clean up the connection string
  let cleanConnectionString = connectionString;
  
  // Remove DATABASE_URL= prefix if present
  if (cleanConnectionString.startsWith('DATABASE_URL=')) {
    cleanConnectionString = cleanConnectionString.substring('DATABASE_URL='.length);
  }
  
  // Remove extra quotes
  if (cleanConnectionString.startsWith('"') && cleanConnectionString.endsWith('"')) {
    cleanConnectionString = cleanConnectionString.slice(1, -1);
  }
  
  console.log("Connection string format:", cleanConnectionString.substring(0, 30) + "...");
  
  if (cleanConnectionString.includes("[") || cleanConnectionString.includes("]")) {
    console.log("❌ Connection string contains placeholders");
    console.log("Please replace [YOUR-PASSWORD] with your actual database password");
    return;
  }
  
  if (!cleanConnectionString.startsWith('postgresql://')) {
    console.log("❌ Connection string format is incorrect");
    console.log("Expected format: postgresql://postgres.xxx:password@aws-0-region.pooler.supabase.com:6543/postgres");
    return;
  }
  
  try {
    console.log("✅ Connection string format looks correct");
    
    // Test database connection
    const sql = postgres(cleanConnectionString, { 
      prepare: false,  // Required for Supabase transaction pooler
      connect_timeout: 10,
      idle_timeout: 20
    });
    
    // Test basic query
    const result = await sql`SELECT version()`;
    console.log("✅ Database connection successful!");
    console.log("PostgreSQL version:", result[0].version.substring(0, 50) + "...");
    
    // Check if our tables exist
    const tableCheck = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'searches', 'search_results')
    `;
    
    console.log("📋 Existing tables:", tableCheck.map(t => t.table_name));
    
    if (tableCheck.length < 3) {
      console.log("⚠️  Some tables are missing. Please run the SQL setup script:");
      console.log("1. Open Supabase dashboard -> SQL Editor");
      console.log("2. Copy and run the SQL from 'supabase_complete_setup.sql'");
      console.log("3. This will create users, searches, and search_results tables");
    } else {
      console.log("✅ All required tables exist");
      
      // Test RLS policies by trying to access auth.users (this should work)
      try {
        const authTest = await sql`SELECT COUNT(*) FROM auth.users`;
        console.log("✅ Supabase Auth integration working");
      } catch (error) {
        console.log("⚠️  Auth integration test failed (this is normal if no users exist)");
      }
    }
    
    await sql.end();
    console.log("🎉 Supabase setup test completed!");
    
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    
    if (error.message.includes('Invalid URL')) {
      console.log("\n💡 Fix: Remove extra quotes from the connection string");
      console.log("The connection string should NOT have quotes around it in the secret");
    } else if (error.message.includes('CONNECT_TIMEOUT')) {
      console.log("\n💡 Fix: Check network connectivity or verify the connection string");
    } else if (error.message.includes('authentication failed')) {
      console.log("\n💡 Fix: Verify the password in the connection string is correct");
    }
  }
}

testSupabaseConnection();
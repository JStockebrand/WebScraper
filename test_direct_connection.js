import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

async function testDirectConnection() {
  console.log("Testing direct PostgreSQL connection to Supabase...");
  
  // Since the DATABASE_URL secret seems to be cached, let's test if we can construct it manually
  // This is just for testing - the actual app will use the environment variable
  
  const currentUrl = process.env.DATABASE_URL;
  console.log("Current DATABASE_URL format:", currentUrl?.substring(0, 30) + "...");
  
  // Check if it starts with postgresql://
  if (!currentUrl?.startsWith('postgresql://')) {
    console.log("❌ DATABASE_URL is not in PostgreSQL format");
    console.log("Expected format: postgresql://postgres.xxx:password@aws-0-region.pooler.supabase.com:6543/postgres");
    console.log("Current format starts with:", currentUrl?.substring(0, 10));
    return;
  }
  
  try {
    console.log("✅ DATABASE_URL is in correct PostgreSQL format");
    
    // Test connection
    const sql = postgres(currentUrl, {
      connect_timeout: 10,
      idle_timeout: 20
    });
    
    // Test basic query
    const result = await sql`SELECT version()`;
    console.log("✅ Connection successful! PostgreSQL version:", result[0].version.substring(0, 50) + "...");
    
    // Test if our tables exist
    const tableCheck = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('searches', 'search_results')
    `;
    
    console.log("📋 Existing tables:", tableCheck.map(t => t.table_name));
    
    if (tableCheck.length === 0) {
      console.log("⚠️  Tables don't exist yet. Creating them...");
      
      // Create tables
      await sql`
        CREATE TABLE IF NOT EXISTS searches (
          id SERIAL PRIMARY KEY,
          query TEXT NOT NULL,
          status TEXT NOT NULL,
          total_results INTEGER DEFAULT 0,
          search_time INTEGER,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;
      
      await sql`
        CREATE TABLE IF NOT EXISTS search_results (
          id SERIAL PRIMARY KEY,
          search_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          url TEXT NOT NULL,
          domain TEXT NOT NULL,
          published_date TEXT,
          reading_time TEXT,
          scraping_status TEXT NOT NULL,
          summary TEXT,
          confidence INTEGER,
          sources_count INTEGER DEFAULT 0,
          keywords TEXT,
          metadata TEXT,
          error_message TEXT,
          FOREIGN KEY (search_id) REFERENCES searches(id)
        )
      `;
      
      console.log("✅ Tables created successfully!");
    } else {
      console.log("✅ Tables already exist");
    }
    
    // Test basic CRUD operations
    console.log("Testing database operations...");
    
    const [testSearch] = await sql`
      INSERT INTO searches (query, status) 
      VALUES ('test connection', 'completed') 
      RETURNING *
    `;
    
    console.log("✅ Test search created:", { id: testSearch.id, query: testSearch.query });
    
    // Clean up
    await sql`DELETE FROM searches WHERE id = ${testSearch.id}`;
    console.log("✅ Test data cleaned up");
    
    await sql.end();
    console.log("🎉 Supabase connection test completed successfully!");
    
  } catch (error) {
    console.error("❌ Connection test failed:", error.message);
    console.error("Error details:", error.code || error.errno || 'Unknown error');
  }
}

testDirectConnection();
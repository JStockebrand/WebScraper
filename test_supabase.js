import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

async function testSupabaseConnection() {
  try {
    console.log("Testing Supabase connection...");
    console.log("DATABASE_URL format check:", process.env.DATABASE_URL?.slice(0, 50) + "...");
    
    // Configure postgres client with timeout settings for Supabase
    const sql = postgres(process.env.DATABASE_URL, {
      connect_timeout: 10,
      idle_timeout: 20,
      max_lifetime: 60 * 30
    });
    const db = drizzle(sql);
    
    // Create tables if they don't exist
    console.log("Creating tables...");
    
    await sql`
      CREATE TABLE IF NOT EXISTS searches (
        id SERIAL PRIMARY KEY,
        query TEXT NOT NULL,
        status TEXT NOT NULL,
        total_results INTEGER DEFAULT 0,
        search_time INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );
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
      );
    `;
    
    console.log("✅ Tables created successfully!");
    
    // Test basic operations
    console.log("Testing database operations...");
    
    // Insert a test search
    const testSearch = await db.insert(searches).values({
      query: "test query",
      status: "completed"
    }).returning();
    
    console.log("✅ Test search created:", testSearch[0]);
    
    // Clean up test data
    await db.delete(searches).where({ id: testSearch[0].id });
    console.log("✅ Test data cleaned up");
    
    console.log("🎉 Supabase connection test successful!");
    
    await sql.end();
  } catch (error) {
    console.error("❌ Supabase connection test failed:", error);
  }
}

testSupabaseConnection();
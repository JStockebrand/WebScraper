import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

async function createSupabaseTables() {
  console.log("Creating Supabase tables...");
  
  let databaseUrl = process.env.SUPABASE_CONNECTION_STRING;
  
  if (!databaseUrl) {
    console.log("❌ SUPABASE_CONNECTION_STRING not found");
    return;
  }
  
  // Clean up the connection string
  if (databaseUrl.startsWith('DATABASE_URL=')) {
    databaseUrl = databaseUrl.substring('DATABASE_URL='.length);
  }
  
  if (databaseUrl.startsWith('"') && databaseUrl.endsWith('"')) {
    databaseUrl = databaseUrl.slice(1, -1);
  }
  
  try {
    const sql = postgres(databaseUrl, { prepare: false });
    
    console.log("Creating users table...");
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        display_name VARCHAR(100),
        subscription_tier VARCHAR(20) DEFAULT 'free',
        searches_used INTEGER DEFAULT 0,
        searches_limit INTEGER DEFAULT 10,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    
    console.log("Creating searches table...");
    await sql`
      CREATE TABLE IF NOT EXISTS searches (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        query TEXT NOT NULL,
        status TEXT NOT NULL,
        total_results INTEGER DEFAULT 0,
        search_time INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `;
    
    console.log("Creating search_results table...");
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
        FOREIGN KEY (search_id) REFERENCES searches(id) ON DELETE CASCADE
      )
    `;
    
    console.log("Creating indexes...");
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_searches_user_id ON searches(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_searches_created_at ON searches(created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_search_results_search_id ON search_results(search_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_search_results_confidence ON search_results(confidence)`;
    
    // Test table creation
    const tableCheck = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'searches', 'search_results')
    `;
    
    console.log("✅ Tables created successfully:", tableCheck.map(t => t.table_name));
    
    await sql.end();
    console.log("🎉 Database setup completed!");
    
  } catch (error) {
    console.error("❌ Database setup failed:", error.message);
  }
}

createSupabaseTables();
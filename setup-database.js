const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function setupDatabase() {
  const supabase = createClient(
    'https://gypxdmiplgdgebxkcesh.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5cHhkbWlwbGdkZ2VieGtjZXNoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjY2NjcxOSwiZXhwIjoyMDY4MjQyNzE5fQ.EJm-NNQtvf_c3jToFDJLoFzjVdQO4cxg8oUnMkD3nW0'
  );

  try {
    const schema = fs.readFileSync('./supabase/schema.sql', 'utf8');
    
    console.log('🗄️  Setting up Supabase database...');
    
    const { data, error } = await supabase.rpc('execute_sql', {
      sql_query: schema
    });

    if (error) {
      console.error('❌ Database setup failed:', error);
    } else {
      console.log('✅ Database setup completed successfully!');
      console.log('📊 Tables created: user_profiles, schemas, api_specs, deployments, audit_logs');
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.log('\n💡 Manual setup required:');
    console.log('1. Go to https://supabase.com/dashboard/project/gypxdmiplgdgebxkcesh');
    console.log('2. Open SQL Editor');
    console.log('3. Copy content from supabase/schema.sql');
    console.log('4. Paste and run the query');
  }
}

setupDatabase();
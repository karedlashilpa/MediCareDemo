#!/usr/bin/env node

/**
 * Supabase Setup Helper
 * 
 * This script helps configure Supabase credentials for the MediCareDemo application.
 * It can be run from the command line to set up environment variables and update
 * the HTML configuration.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(text) {
  return new Promise((resolve) => {
    rl.question(text, resolve);
  });
}

async function setupSupabase() {
  console.log('🏥 MediCareDemo Supabase Setup');
  console.log('================================\n');
  
  console.log('Please provide your Supabase project credentials:');
  console.log('(You can find these in your Supabase Dashboard > Project Settings > API)\n');
  
  const supabaseUrl = await question('Supabase Project URL: ');
  const supabaseAnonKey = await question('Supabase Anonymous Key: ');
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Both URL and Anonymous Key are required.');
    process.exit(1);
  }
  
  // Validate URL format
  if (!supabaseUrl.includes('supabase.co')) {
    console.warn('⚠️  The URL doesn\'t look like a Supabase URL. Please verify it\'s correct.');
  }
  
  try {
    // Create .env file
    const envContent = `# Supabase Configuration
SUPABASE_URL=${supabaseUrl}
SUPABASE_ANON_KEY=${supabaseAnonKey}

# Site URL for authentication redirects
SITE_URL=http://localhost:3000
`;
    
    fs.writeFileSync('.env', envContent);
    console.log('✅ Created .env file with your credentials');
    
    // Update HTML file
    const htmlPath = 'index.html';
    if (fs.existsSync(htmlPath)) {
      let htmlContent = fs.readFileSync(htmlPath, 'utf8');
      
      // Replace placeholder values
      htmlContent = htmlContent.replace(
        'YOUR_SUPABASE_URL_HERE',
        supabaseUrl
      ).replace(
        'YOUR_SUPABASE_ANON_KEY_HERE', 
        supabaseAnonKey
      );
      
      fs.writeFileSync(htmlPath, htmlContent);
      console.log('✅ Updated index.html with your credentials');
    }
    
    console.log('\n🎉 Setup complete!');
    console.log('\nNext steps:');
    console.log('1. Set up your database schema (see assets/supabase.md)');
    console.log('2. Open index.html in your browser or serve with a local server');
    console.log('3. Check the browser console to verify Supabase connection');
    
  } catch (error) {
    console.error('❌ Error during setup:', error.message);
    process.exit(1);
  }
  
  rl.close();
}

// Run if called directly
if (require.main === module) {
  setupSupabase().catch(console.error);
}

module.exports = { setupSupabase };

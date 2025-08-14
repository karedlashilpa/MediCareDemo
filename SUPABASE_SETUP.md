# Supabase Setup Guide for MediCareDemo

This guide will help you set up Supabase for the MediCareDemo healthcare application.

## Quick Start

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create an account
2. Click "New Project"
3. Choose your organization and give your project a name
4. Select a region close to your users
5. Generate a strong database password
6. Click "Create new project"

### 2. Get Your Credentials

1. Go to your project dashboard
2. Click on "Settings" in the sidebar
3. Click on "API" 
4. Copy your:
   - Project URL
   - `anon` `public` key

### 3. Configure the Application

#### Option A: Automatic Setup (Recommended)

1. Run the setup script:
   ```bash
   node setup-supabase.js
   ```
2. Enter your Supabase URL and anonymous key when prompted

#### Option B: Manual Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your credentials:
   ```env
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. Update `index.html` and replace the placeholder values:
   ```javascript
   window.__SUPABASE_CONFIG__ = {
     url: 'https://your-project-id.supabase.co',
     anonKey: 'your-anon-key-here'
   };
   ```

### 4. Set Up the Database

1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the sidebar
3. Copy the contents of `database-setup.sql`
4. Paste it into the SQL Editor
5. Click "Run" to execute the setup

This will create:
- `doctors` table with sample data
- `appointments` table
- Row Level Security policies
- Performance indexes
- Triggers for automatic timestamp updates

### 5. Configure Authentication

1. In your Supabase dashboard, go to "Authentication" > "Settings"
2. Enable "Enable email confirmations" for production
3. Set up your Site URL:
   - Development: `http://localhost:3000`
   - Production: `https://yourdomain.com`
4. Add redirect URLs:
   - `http://localhost:3000/**`
   - `https://yourdomain.com/**`

### 6. Test the Setup

1. Open `index.html` in your browser or serve it locally
2. Open the browser console
3. You should see:
   ```
   [supabaseClient] Module loaded.
   [appointments] Module loaded.
   [auth] Module loaded (stub).
   ```
4. Test the configuration:
   ```javascript
   // In browser console
   console.log('Supabase configured:', window.__SUPABASE_CONFIG__);
   ```

## Database Schema

### Tables

#### doctors
- Stores doctor profiles and specialties
- Public read access, admin-only write access

#### appointments  
- Stores patient appointment bookings
- User can only see their own appointments
- Supports anonymous bookings (user_id can be NULL)

### Security

- **Row Level Security (RLS)** is enabled on all tables
- Users can only access their own appointment data
- Admin users (with `role: 'admin'` in metadata) can manage all data
- Anonymous users can view doctors and book appointments

## Admin User Setup

To create an admin user:

1. Sign up a user through your application
2. In Supabase dashboard, go to "Authentication" > "Users"
3. Click on the user you want to make admin
4. In "User Metadata", add:
   ```json
   {
     "role": "admin"
   }
   ```

## Troubleshooting

### Common Issues

**"No Supabase credentials found"**
- Check that your `.env` file exists and has the correct variables
- Verify the variable names match: `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- Restart your development server

**"Failed to create Supabase client"**
- Ensure the Supabase CDN script is loaded before your modules
- Check browser console for network errors
- Verify your project URL and anon key are correct

**Authentication not working**
- Check that email authentication is enabled in Supabase
- Verify your site URL and redirect URLs are configured
- Check the browser console for auth errors

**Database queries failing**
- Verify the tables were created successfully
- Check that RLS policies are enabled
- Ensure you're authenticated for user-specific operations

### Debug Commands

Test database connection:
```javascript
const client = getSupabaseClient();
client.from('doctors').select('count')
  .then(result => console.log('Doctors count:', result))
  .catch(err => console.error('DB error:', err));
```

Test authentication:
```javascript
const client = getSupabaseClient();
client.auth.getSession()
  .then(session => console.log('Current session:', session))
  .catch(err => console.error('Auth error:', err));
```

### Getting Help

1. Check the [Supabase documentation](https://supabase.com/docs)
2. Review the browser console for error messages
3. Check the Network tab for failed requests
4. Verify your database setup in the Supabase dashboard

## Production Deployment

### Environment Variables

Set these on your hosting platform:
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SITE_URL=https://yourdomain.com
```

### Security Checklist

- [ ] Email confirmation enabled
- [ ] Strong password requirements set
- [ ] RLS policies tested with real users
- [ ] Admin users properly configured
- [ ] Site URL and redirect URLs updated for production domain
- [ ] Database backups enabled
- [ ] Rate limiting configured if needed

### Performance Optimization

- [ ] Database indexes are in place (handled by setup script)
- [ ] Consider enabling database connection pooling for high traffic
- [ ] Monitor query performance in Supabase dashboard
- [ ] Set up real-time subscriptions only where needed

---

For more detailed information, see `assets/supabase.md`.

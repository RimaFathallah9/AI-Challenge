# 🔐 NEXOVA Login Troubleshooting Guide

## ❌ Current Issue: Login Failed

You're seeing **"Login failed. Please try again."** when trying to login.

---

## 🎯 Root Causes & Solutions

### Issue #1: Wrong Email Address (MOST LIKELY)

**Symptom**: You used `admin@gmail.com` in the login screenshot

**Solution**: 
- Use the correct test credentials:
  - 📧 **Email**: `test@gmail.com` (NOT admin@gmail.com)
  - 🔐 **Password**: `test`

---

### Issue #2: Test User Not Created in Database

**Symptom**: Even with correct email, login fails

**Check if user exists**:

```powershell
cd c:\Users\rimaf\OneDrive\Desktop\AI-Challenge\backend

# Run the setup script (creates user if missing)
node setup-and-seed.js
```

**Expected output**:
```
✅ Test user created/updated!
📧 Email: test@gmail.com
🔐 Password: test
👤 Role: ADMIN

✨ Setup Complete!
═══════════════════════════════════════════════

🚀 You can now login with:
   📧 Email: test@gmail.com
   🔐 Password: test
```

---

### Issue #3: PostgreSQL Database Not Running

**Symptom**: Script says "❌ Database connection failed!"

**Solution - Windows**:

1. **Check if PostgreSQL is installed**:
   ```powershell
   psql --version
   ```

2. **Start PostgreSQL** (if using Windows Service):
   ```powershell
   # As Administrator:
   net start PostgreSQL16  # or PostgreSQL15, depending on version
   
   # Or use Services app:
   # Press Win + R, type "services.msc", find PostgreSQL, double-click > Start
   ```

3. **Using pgAdmin (GUI)**:
   - Open pgAdmin
   - Look for PostgreSQL server in left panel
   - Right-click > Connect
   - Should show green checkmark

4. **Test connection**:
   ```powershell
   psql -U nexova -d nexova_db -h localhost
   # If it asks for password, type: nexova123
   # If it connects, type: \q to quit
   ```

---

## 🔄 Complete Login Setup Flow

### Step-by-Step Instructions

**1. Verify PostgreSQL is running**
```powershell
psql -U postgres -c "SELECT 1" 2>&1
# Should NOT show connection error
```

**2. Navigate to backend folder**
```powershell
cd c:\Users\rimaf\OneDrive\Desktop\AI-Challenge\backend
```

**3. Run setup script**
```powershell
node setup-and-seed.js
```

**4. Wait for success message**
```
✅ Test user created/updated!
📧 Email: test@gmail.com
🔐 Password: test
```

**5. Go to login page**
- Frontend URL: Single browser window or check console for URL
- Default: `http://localhost:5173` (Vite dev server) or `http://localhost` (if build deployed)

**6. Login with test credentials**
- Email: `test@gmail.com` ← **IMPORTANT: NOT admin@gmail.com**
- Password: `test`

**7. You should see the dashboard**
- Real-time charts
- Machine data
- WebSocket indicator (green)

---

## 🆘 Advanced Troubleshooting

### Check Backend is Running

```powershell
# In a new terminal
curl http://localhost:4000/health

# Should return health check response (not error)
```

### Check Frontend Connection

```powershell
# Open browser developer console (F12)
# Go to Console tab
# Look for errors like:
# - CORS errors → Backend not running
# - Connection refused → Backend on wrong port
# - "Invalid credentials" → User doesn't exist
```

### View Actual Error from Backend

```powershell
# Check backend console output for detailed error
# Should show something like:
# "Invalid credentials" → User not found OR password wrong
# "Database error" → Postgres not running
```

### Manual User Creation

If setup-and-seed.js fails, create user manually:

```powershell
# In another terminal, connect to database
psql -U nexova -d nexova_db -h localhost

# Then paste:
INSERT INTO "User" (id, email, password, name, role, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'test@gmail.com',
  '$2a$12$...',  -- bcrypt hash of 'test'
  'Test Administrator',
  'ADMIN',
  NOW(),
  NOW()
);

# Exit with: \q
```

---

## ✅ Verification Checklist

Before trying to login again, verify:

- [ ] PostgreSQL is running (`psql -U postgres -c "SELECT 1"` works)
- [ ] Backend is running (check console has no errors)
- [ ] Frontend is accessible (browser can reach URL)
- [ ] Test user exists (`node setup-and-seed.js` shows success)
- [ ] Using correct email: **test@gmail.com** (not admin@gmail.com)
- [ ] Using correct password: **test**

---

## 📋 Default Credentials

### Test User (Auto-Created)
```
Email:    test@gmail.com
Password: test
Role:     ADMIN
```

### Database Credentials
```
User:     nexova
Password: nexova123
Host:     localhost
Port:     5432
Database: nexova_db
```

---

## 🚀 Quick Reference Commands

```powershell
# Start PostgreSQL (Windows Service)
net start PostgreSQL16

# Test database connection
psql -U postgres -c "SELECT 1"

# Setup and seed test user
cd backend
node setup-and-seed.js

# Check backend health
curl http://localhost:4000/health

# View backend logs
# Check your backend console window

# List all users in database
# Use setup-and-seed.js output
```

---

## 💡 Common Mistakes

| ❌ Mistake | ✅ Correct |
|-----------|----------|
| Email: `admin@gmail.com` | Email: `test@gmail.com` |
| Password: `password` | Password: `test` |
| Not running PostgreSQL | Start PostgreSQL service first |
| Waiting for response forever | Check backend console for errors |
| CORS errors in browser | Ensure backend is running on 4000 |
| "User not found" after login | Run `node setup-and-seed.js` again |

---

## 🔒 Set Up Additional Users

After test user works, create more users through the app:

1. Go to Register page
2. Create new account with:
   - Email: your-email@gmail.com
   - Password: your-password
   - Name: Your Name
3. Your account is created with TECHNICIAN role by default
4. To make ADMIN, edit database:
   ```powershell
   psql -U nexova -d nexova_db
   UPDATE "User" SET role = 'ADMIN' WHERE email = 'your-email@gmail.com';
   \q
   ```

---

## 📝 Summary

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Ensure PostgreSQL running | `psql` command works |
| 2 | Run `node backend/setup-and-seed.js` | ✅ User seeded message |
| 3 | Go to `http://localhost:5173` or `http://localhost` | Login page loads |
| 4 | Enter `test@gmail.com` / `test` | ✅ Logged in successfully |
| 5 | See dashboard | ✅ Real-time data visible |

---

## 🎓 What to Try Next

Once logged in:
1. Explore machine data on dashboard
2. Check alerts page
3. Try chat with AI (Gemini integration)
4. Monitor real-time sensor data - should update every 2 seconds
5. Create alerts and forecasts
6. Check admin panel settings

---

**Still getting errors?** Check the backend console for detailed error messages and share them for further debugging.

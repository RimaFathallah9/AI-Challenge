# NEXOVA Login Troubleshooting Guide

## Error: "Login failed. Please try again."

This guide will help you debug and fix login failures in NEXOVA.

---

## ✅ Quick Fix Checklist

### 1. **Verify Services Are Running**
```bash
# Check Docker containers
docker ps

# Expected output should show:
# - nexova-postgres (healthy)
# - nexova-backend (running)
# - nexova-ai (running)
# - nexova-frontend (running)
```

### 2. **Create Test User**
```bash
# From project root
cd backend

# Run seed script to create test@gmail.com
node seed-user.js

# Output should show:
# ✅ User seeded successfully!
# 📧 Email: test@gmail.com
# 🔐 Password: test
# 👤 Role: ADMIN
```

### 3. **Test Login with Correct Credentials**
- **Email**: `test@gmail.com`
- **Password**: `test`

---

## 🔧 Detailed Troubleshooting

### Problem 1: Services Not Running

#### Solution A: Start Docker Compose
```bash
cd c:\Users\rimaf\OneDrive\Desktop\AI-Challenge

# Remove old containers
docker compose down -v

# Start fresh
docker compose up -d

# Wait 15-20 seconds for services to initialize
```

#### Solution B: Check Service Logs
```bash
# Check backend logs
docker logs nexova-backend

# Check database logs
docker logs nexova-postgres

# Check AI service logs
docker logs nexova-ai

# Check frontend logs
docker logs nexova-frontend
```

#### Solution C: Rebuild Services
```bash
# Force rebuild all images
docker compose down
docker compose build --no-cache
docker compose up -d
```

---

### Problem 2: Database Connection Failed

#### Error Messages:
```
Can't reach database server at `localhost:5432`
ECONNREFUSED - PostgreSQL not responding
```

#### Solution:
```bash
# 1. Ensure PostgreSQL is healthy
docker compose ps postgres

# Status should be: Up (healthy) or Up

# 2. If not healthy, check logs
docker logs nexova-postgres

# 3. Wait for health check
docker compose up -d

# 4. Wait 30 seconds, then try again
Start-Sleep -Seconds 30

# 5. Test database connection
docker exec nexova-postgres pg_isready -U nexova
```

---

### Problem 3: Test User Doesn't Exist

#### Error Upon Login:
```
Invalid credentials
or
User not found
```

#### Solution:
```bash
# 1. Navigate to backend
cd \path\to\backend

# 2. Run seed script (database must be running first)
node seed-user.js

# Expected output:
# 🌱 Seeding test user...
# ✅ User seeded successfully!
# 📧 Email: test@gmail.com
# 🔐 Password: test
# 👤 Role: ADMIN
```

#### If Seed Script Fails: Database Connection Issue
```bash
# 1. Check database is running
docker ps | grep postgres

# 2. Check database environment variables
docker exec nexova-backend env | grep DATABASE

# 3. Verify connection string
# Expected: postgresql://nexova:nexova123@postgres:5432/nexova_db?schema=public
```

---

### Problem 4: Backend Not Responding

#### Error: `Connection refused` or `localhost:4000 not reachable`

#### Solution:
```bash
# 1. Check backend container status
docker ps | grep backend

# 2. View backend logs
docker logs nexova-backend

# Look for error messages like:
# - "listening on port 4000"
# - "Database connection successful"
# - "Prisma client initialized"

# 3. If not running, check why
docker logs --tail 50 nexova-backend

# 4. Rebuild backend if needed
docker compose build backend --no-cache
docker compose up -d backend

# 5. Wait for health check
docker compose ps backend
```

---

### Problem 5: API Request Fails (Frontend → Backend)

#### Error: `net::ERR_CONNECTION_REFUSED`

#### Solution:
```bash
# 1. From frontend container, test backend connectivity
docker exec nexova-frontend curl -v http://nexova-backend:4000/api/auth/login

# 2. Check frontend environment
docker exec nexova-frontend env | grep API

# 3. Check backend CORS configuration
# File: backend/src/app.ts
# Should have CORS enabled for frontend origin
```

---

### Problem 6: Invalid JWT Token

#### Error: `401 Unauthorized` or `Invalid token`

#### Solution:
```bash
# 1. Verify JWT secrets are set
docker exec nexova-backend env | grep JWT

# Expected output:
# JWT_SECRET=nexova_super_secret_jwt_key_2024_change_in_prod
# JWT_REFRESH_SECRET=nexova_refresh_secret_2024_change_in_prod

# 2. If empty, update .env or docker-compose.yml
# File: docker-compose.yml (services.backend.environment)

# 3. Restart backend
docker compose restart backend
```

---

## 🧪 Testing Login Endpoint Manually

### Method 1: Using PowerShell
```powershell
# Test login endpoint
$body = @{
    email = "test@gmail.com"
    password = "test"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:4000/api/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body `
    -SkipHttpErrorCheck | Select-Object StatusCode, Content
```

### Method 2: Using curl (if available)
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@gmail.com","password":"test"}'
```

### Expected Success Response:
```json
{
  "user": {
    "id": "user_id_here",
    "email": "test@gmail.com",
    "name": "Test Administrator",
    "role": "ADMIN"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

## 📋 Complete Reset Procedure

If nothing else works, perform a complete reset:

```bash
# 1. Navigate to project root
cd c:\Users\rimaf\OneDrive\Desktop\AI-Challenge

# 2. Stop all containers
docker compose down -v

# 3. Remove any dangling images
docker image prune -f

# 4. Rebuild from scratch
docker compose build --no-cache

# 5. Start services
docker compose up -d

# 6. Wait 30 seconds for database to initialize
Start-Sleep -Seconds 30

# 7. Seed test user
cd backend
node seed-user.js

# 8. Verify login works
# Open http://localhost/login
# Email: test@gmail.com
# Password: test
```

---

## 🔍 Key Configuration Locations

### Database Connection
- **File**: `backend/src/config/env.ts`
- **Docker Env**: `docker-compose.yml` → `services.backend.environment.DATABASE_URL`
- **Default**: `postgresql://nexova:nexova123@postgres:5432/nexova_db?schema=public`

### JWT Configuration
- **File**: `backend/src/config/env.ts`
- **Secrets**: 
  - `JWT_SECRET`: Access token signing key
  - `JWT_REFRESH_SECRET`: Refresh token signing key
  - `JWT_EXPIRES_IN`: Token lifetime (default: 15m)

### Backend Port
- **Container**: `4000`
- **Host**: `4000`
- **Check**: `docker exec nexova-backend lsof -i :4000`

### Frontend API URL
- **File**: `frontend/src/services/api.ts`
- **Default (Dev)**: `http://localhost:4000/api`
- **Default (Docker)**: Service name `http://nexova-backend:4000/api`

---

## ✨ Test Credentials

After seeding with `node seed-user.js`:

| Field | Value |
|-------|-------|
| Email | test@gmail.com |
| Password | test |
| Role | ADMIN |
| Status | Active |

---

## 🚀 Next Steps After Successful Login

1. ✅ Dashboard loads with real-time sensor data
2. ✅ WebSocket connects (2-second broadcast)
3. ✅ Charts update in real-time
4. ✅ AI chatbot is responsive
5. ✅ Machine list displays factories
6. ✅ Alert system operational

---

## 📞 Quick Debug Commands

```bash
# Check all services
docker compose ps

# View real-time logs
docker compose logs -f

# Access backend shell
docker exec -it nexova-backend sh

# Access database shell
docker exec -it nexova-postgres psql -U nexova -d nexova_db

# List users in database
docker exec -it nexova-postgres psql -U nexova -d nexova_db -c "SELECT * FROM users;"

# Test network connectivity
docker exec nexova-frontend ping nexova-backend

# Restart specific service
docker compose restart backend
```

---

## 📝 Common Error Messages & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `Invalid credentials` | User not found or wrong password | Run `node seed-user.js` |
| `Can't reach database` | PostgreSQL not running | `docker compose up -d postgres` |
| `Connection refused` | Backend port not open | Check `docker ps` and `docker logs` |
| `CORS error` | Frontend can't reach backend | Verify service names in docker-compose.yml |
| `JWT token invalid` | Token expired or wrong secret | Check JWT_SECRET matches signer |
| `Prisma error` | Database schema mismatch | Run `npx prisma migrate dev` |

---

**Last Updated**: February 28, 2026  
**Version**: 1.0.0

For additional help, check the backend logs:
```bash
docker logs nexova-backend --tail 100
```

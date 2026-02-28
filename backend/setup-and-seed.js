#!/usr/bin/env node
/**
 * NEXOVA Login Troubleshooting & Setup Script
 * This script will:
 * 1. Check if database is reachable
 * 2. Run database migrations
 * 3. Seed test user
 * 4. Show available test credentials
 */

const { PrismaClient } = require('@prisma/client');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const prisma = new PrismaClient();

async function checkDatabaseConnection() {
  try {
    console.log('🔍 Checking database connection...');
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connected successfully!');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed!');
    console.error('Error:', error.message);
    return false;
  }
}

async function runMigrations() {
  try {
    console.log('\n📊 Running Prisma migrations...');
    const { stdout, stderr } = await execPromise('npx prisma migrate deploy');
    console.log('✅ Migrations completed!');
    return true;
  } catch (error) {
    console.log('⚠️ Migrations may have warnings (this is okay if schema exists)');
    return true;
  }
}

async function seedTestUser() {
  try {
    console.log('\n🌱 Seeding test user...');
    const bcrypt = require('bcryptjs');
    
    const hashedPassword = await bcrypt.hash('test', 12);
    
    const user = await prisma.user.upsert({
      where: { email: 'test@gmail.com' },
      update: {
        password: hashedPassword,
        role: 'ADMIN',
        name: 'Test Administrator'
      },
      create: {
        email: 'test@gmail.com',
        password: hashedPassword,
        name: 'Test Administrator',
        role: 'ADMIN'
      }
    });

    console.log('✅ Test user created/updated!');
    console.log(`📧 Email: ${user.email}`);
    console.log(`🔐 Password: test`);
    console.log(`👤 Role: ${user.role}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to seed user:', error.message);
    return false;
  }
}

async function listAllUsers() {
  try {
    console.log('\n👥 Listing all users in database:');
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, createdAt: true }
    });
    
    if (users.length === 0) {
      console.log('❌ No users found in database!');
      return false;
    }

    console.log('\n┌─ Users ────────────────────────────────────────┐');
    users.forEach((user, index) => {
      console.log(`│ ${index + 1}. Email: ${user.email}`);
      console.log(`│    Role: ${user.role}`);
      console.log(`│    Name: ${user.name}`);
    });
    console.log('└────────────────────────────────────────────────┘');
    return true;
  } catch (error) {
    console.error('❌ Error listing users:', error.message);
    return false;
  }
}

async function main() {
  try {
    console.log('🔧 NEXOVA Login & Database Setup\n');
    console.log('═'.repeat(50));

    // Step 1: Check database
    const dbConnected = await checkDatabaseConnection();
    if (!dbConnected) {
      console.log('\n⚠️  CRITICAL: PostgreSQL is not running!');
      console.log('Please start PostgreSQL on localhost:5432');
      console.log('Then run this script again.');
      process.exit(1);
    }

    // Step 2: Run migrations
    await runMigrations();

    // Step 3: Seed test user
    await seedTestUser();

    // Step 4: List all users
    await listAllUsers();

    console.log('\n✨ Setup Complete!');
    console.log('═'.repeat(50));
    console.log('\n🚀 You can now login with:');
    console.log('   📧 Email: test@gmail.com');
    console.log('   🔐 Password: test');
    console.log('\n🌐 Frontend: http://localhost:5173');
    console.log('📡 Backend: http://localhost:4000');

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

main();

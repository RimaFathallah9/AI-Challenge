#!/usr/bin/env node
/**
 * Seed test user for NEXOVA login demo
 * Usage: node seed-user.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seedUser() {
  try {
    console.log('🌱 Seeding test user...');
    
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

    console.log('✅ User seeded successfully!');
    console.log(`📧 Email: ${user.email}`);
    console.log(`🔐 Password: test`);
    console.log(`👤 Role: ${user.role}`);
    console.log(`🆔 ID: ${user.id}`);
    
  } catch (error) {
    console.error('❌ Error seeding user:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

seedUser();

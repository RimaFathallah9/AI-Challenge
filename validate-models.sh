#!/bin/bash

# ═════════════════════════════════════════════════════════════════════════════
# NEXOVA AI MODEL VALIDATION - QUICK START SCRIPT
# ═════════════════════════════════════════════════════════════════════════════
# Run this script to validate all AI models with the new dataset

echo "🚀 NEXOVA AI Model Validation - Quick Start"
echo "═════════════════════════════════════════════════════════════════════════════"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Seed Database
echo -e "\n${BLUE}Step 1: Seeding database with comprehensive test data...${NC}"
cd "backend" || exit
npx ts-node src/prisma/comprehensive-seed.ts

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database seeding complete!${NC}"
else
    echo -e "${YELLOW}⚠️ Database seeding failed. Check database connection.${NC}"
    exit 1
fi

# Step 2: Build Backend
echo -e "\n${BLUE}Step 2: Building backend (validating TypeScript)...${NC}"
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend build successful!${NC}"
else
    echo -e "${YELLOW}⚠️ Backend build failed. Check TypeScript errors.${NC}"
    exit 1
fi

# Step 3: Start Backend
echo -e "\n${BLUE}Step 3: Starting backend server...${NC}"
echo -e "${YELLOW}Watch for: '[Backend] Server listening on port 3000'${NC}"
npm start &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# Step 4: Run Tests
echo -e "\n${BLUE}Step 4: Running comprehensive validation tests...${NC}"
echo -e "${YELLOW}Testing 8 AI features with 35+ test cases${NC}"

cd ..
node test-all-models.js

TEST_RESULT=$?

# Cleanup
echo -e "\n${BLUE}Cleaning up...${NC}"
kill $BACKEND_PID 2>/dev/null

# Final Status
echo -e "\n${BLUE}═════════════════════════════════════════════════════════════════════════════${NC}"
if [ $TEST_RESULT -eq 0 ]; then
    echo -e "${GREEN}✅ ALL VALIDATION TESTS PASSED!${NC}"
    echo -e "${GREEN}🎉 AI Models are working correctly with the new dataset!${NC}"
else
    echo -e "${YELLOW}⚠️ Some tests failed. Review output above.${NC}"
fi
echo -e "${BLUE}═════════════════════════════════════════════════════════════════════════════${NC}\n"

exit $TEST_RESULT

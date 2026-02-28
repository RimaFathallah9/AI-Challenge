@echo off
REM ═════════════════════════════════════════════════════════════════════════════
REM NEXOVA AI MODEL VALIDATION - WINDOWS QUICK START
REM ═════════════════════════════════════════════════════════════════════════════
REM Run this script to validate all AI models with the new dataset

setlocal enabledelayedexpansion

echo.
echo ^|╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌^|
echo ^|  🚀 NEXOVA AI Model Validation - Windows Quick Start        ^|
echo ^|╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌^|
echo.

REM Step 1: Seed Database
echo [Step 1] Seeding database with comprehensive test data...
cd backend
echo Executing: npx ts-node src/prisma/comprehensive-seed.ts
call npx ts-node src/prisma/comprehensive-seed.ts

if !errorlevel! neq 0 (
    echo.
    echo ⚠️ Database seeding failed. Check database connection.
    exit /b 1
)

echo.
echo ✅ Database seeding complete!
echo.

REM Step 2: Build Backend
echo [Step 2] Building backend ^(validating TypeScript^)...
echo Executing: npm run build
call npm run build

if !errorlevel! neq 0 (
    echo.
    echo ⚠️ Backend build failed. Check TypeScript errors.
    exit /b 1
)

echo.
echo ✅ Backend build successful!
echo.

REM Step 3: Start Backend (in background)
echo [Step 3] Starting backend server in background...
echo Executing: npm start
start "NEXOVA Backend" npm start
timeout /t 5 /nobreak

echo.
echo ✅ Backend server started on port 3000
echo.

REM Step 4: Run Tests
echo [Step 4] Running comprehensive validation tests...
echo Testing 8 AI features with 35+ test cases
echo.

cd ..
echo Executing: node test-all-models.js
call node test-all-models.js

set TEST_RESULT=!errorlevel!

REM Final Status
echo.
echo ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
echo VALIDATION COMPLETE
echo ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌

if !TEST_RESULT! equ 0 (
    echo.
    echo ✅ ALL VALIDATION TESTS PASSED!
    echo 🎉 AI Models are working correctly with the new dataset!
    echo.
) else (
    echo.
    echo ⚠️ Some tests failed. Review output above.
    echo.
)

echo ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
echo.

echo Press any key to close...
pause > nul

exit /b !TEST_RESULT!

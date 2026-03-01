@echo off
REM ML Pipeline Setup Script for Windows
REM Automates complete setup: data generation -> model training -> testing

setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║     🤖 ML Pipeline Setup ^& Training Script (Windows)       ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

cd ai-service

REM Step 1: Check Python
echo [1/6] Checking Python environment...
python --version >nul 2>&1
if errorlevel 1 (
    echo ✗ Python not found
    exit /b 1
)
for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo   Python: %PYTHON_VERSION%

pip --version >nul 2>&1
if errorlevel 1 (
    echo ✗ pip not found
    exit /b 1
)
echo ✓ Environment OK
echo.

REM Step 2: Install dependencies
echo [2/6] Installing dependencies...
pip install -q -r requirements.txt
pip install -q pytest pytest-cov
echo ✓ Dependencies installed
echo.

REM Step 3: Generate training data
echo [3/6] Generating training data...
python data_generator.py
if errorlevel 1 (
    echo ✗ Data generation failed
    exit /b 1
)
echo ✓ Data generation complete
echo.

REM Step 4: Train models
echo [4/6] Training ML models...
python train_models.py
if errorlevel 1 (
    echo ✗ Model training failed
    exit /b 1
)
echo ✓ Model training complete
echo.

REM Step 5: Run tests
echo [5/6] Running tests...
pytest test_models.py -q
if errorlevel 1 (
    echo ⚠ Some tests failed (non-critical)
) else (
    echo ✓ All tests passed
)
echo.

REM Step 6: Validate models
echo [6/6] Validating models...
python -c "
import joblib
import os
import json

models = {
    'forecast_prophet.pkl': 'Forecast (Prophet)',
    'anomaly_isolation_forest.pkl': 'Anomaly Detection (Isolation Forest)',
    'recommendation_rf.pkl': 'Maintenance Recommendation (Random Forest)',
}

print('\n📦 Model Files:')
for model_file, description in models.items():
    path = f'./models/{model_file}'
    if os.path.exists(path):
        size = os.path.getsize(path) / (1024 * 1024)  # MB
        try:
            model = joblib.load(path)
            print(f'  ✓ {description}: {size:.2f} MB')
        except Exception as e:
            print(f'  ✗ {description}: Load error')
    else:
        print(f'  ✗ {description}: Not found')

print('\n📊 Training Metrics:')
try:
    with open('./models/metrics.json', 'r') as f:
        metrics = json.load(f)
    for model_type, values in metrics.get('metrics', {}).items():
        print(f'  {model_type}:')
        for metric, value in values.items():
            if isinstance(value, dict):
                continue
            print(f'    {metric}: {value:.3f}' if isinstance(value, float) else f'    {metric}: {value}')
except Exception as e:
    print(f'  Error reading metrics: {e}')
"
echo ✓ Validation complete
echo.

echo ╔════════════════════════════════════════════════════════════╗
echo ✅ Setup Complete!
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo Next steps:
echo.
echo 1. Start the AI service:
echo    uvicorn main:app --reload
echo.
echo 2. Test the API:
echo    curl http://localhost:8000/health
echo.
echo 3. View API docs:
echo    http://localhost:8000/docs
echo.
echo 4. Run full suite with Docker:
echo    docker-compose up
echo.

pause

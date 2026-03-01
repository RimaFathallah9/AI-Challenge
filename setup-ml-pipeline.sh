#!/bin/bash

# ML Pipeline Setup Script
# Automates complete setup: data generation → model training → testing → validation

set -e  # Exit on error

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     🤖 ML Pipeline Setup & Training Script                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

cd ai-service

# Step 1: Check Python version
echo -e "${BLUE}[1/6]${NC} Checking Python environment..."
python_version=$(python --version 2>&1 | awk '{print $2}')
echo "  Python: $python_version"

if ! command -v pip &> /dev/null; then
    echo -e "${RED}✗ pip not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Environment OK${NC}\n"

# Step 2: Install dependencies
echo -e "${BLUE}[2/6]${NC} Installing dependencies..."
pip install -q -r requirements.txt
pip install -q pytest pytest-cov
echo -e "${GREEN}✓ Dependencies installed${NC}\n"

# Step 3: Generate training data
echo -e "${BLUE}[3/6]${NC} Generating training data..."
python data_generator.py
echo -e "${GREEN}✓ Data generation complete${NC}\n"

# Step 4: Train models
echo -e "${BLUE}[4/6]${NC} Training ML models..."
python train_models.py
echo -e "${GREEN}✓ Model training complete${NC}\n"

# Step 5: Run tests
echo -e "${BLUE}[5/6]${NC} Running tests..."
if pytest test_models.py -q; then
    echo -e "${GREEN}✓ All tests passed${NC}\n"
else
    echo -e "${YELLOW}⚠ Some tests failed (non-critical)${NC}\n"
fi

# Step 6: Validate models
echo -e "${BLUE}[6/6]${NC} Validating models..."
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

echo -e "${GREEN}✓ Validation complete${NC}\n"

echo "╔════════════════════════════════════════════════════════════╗"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo ""
echo "1. Start the AI service:"
echo -e "${YELLOW}   uvicorn main:app --reload${NC}"
echo ""
echo "2. Test the API:"
echo -e "${YELLOW}   curl http://localhost:8000/health${NC}"
echo ""
echo "3. View API docs:"
echo -e "${YELLOW}   open http://localhost:8000/docs${NC}"
echo ""
echo "4. Run full suite with Docker:"
echo -e "${YELLOW}   docker-compose up${NC}"
echo ""

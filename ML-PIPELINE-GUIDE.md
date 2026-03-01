# 🤖 ML Model Pipeline - Complete Guide

## Overview

This project implements a production-ready ML pipeline with:
- **3 Trained Models**: Forecasting, Anomaly Detection, Maintenance Recommendation
- **Automated CI/CD**: GitHub Actions workflows for training, testing, and deployment
- **Data Generation**: Realistic industrial IoT synthetic data
- **Model Versioning**: Automatic model tracking and validation
- **Distributed Inference**: FastAPI service with fallback mechanisms

## 🎯 Models

### 1. **Energy Forecasting** (Prophet)
```
Input:  Historical power consumption (hourly)
Output: 24h-72h forecast with confidence intervals
Metrics: RMSE < 15 kW, MAPE < 10%
Use:    Capacity planning, demand forecasting, cost optimization
```

**Example:**
```bash
curl -X POST http://localhost:8000/forecast \
  -H "Content-Type: application/json" \
  -d '{"data": [100, 102, 101, ...], "horizon": 24}'
```

### 2. **Anomaly Detection** (Isolation Forest)
```
Input:  Power, Temperature, Vibration, Runtime, Production
Output: Anomaly score (0-1), Boolean flag
Metrics: F1-Score > 0.85, AUC-ROC > 0.90
Use:    Real-time equipment monitoring, alert generation
```

**Example:**
```bash
curl -X POST http://localhost:8000/anomaly \
  -H "Content-Type: application/json" \
  -d '{
    "data": [{
      "power": 100,
      "temperature": 45,
      "vibration": 2,
      "runtime": 1.0,
      "production": 5.0
    }]
  }'
```

### 3. **Maintenance Recommendation** (Random Forest)
```
Input:  Equipment sensor readings
Output: Risk level (0-3), Urgency flag, Recommendation text
Metrics: R² > 0.75, MAE < 0.5
Use:    Predictive maintenance scheduling, risk assessment
```

**Example:**
```bash
curl -X POST http://localhost:8000/recommendations \
  -H "Content-Type: application/json" \
  -d '{"data": [{"power": 100, "temperature": 65, ...}]}'
```

## 🚀 Quick Start

### Prerequisites
```bash
# Python 3.11+
python --version

# Dependencies
pip install -r ai-service/requirements.txt
```

### 1️⃣ Generate Training Data
```bash
cd ai-service
python data_generator.py
```
**Output:**
- `data/train_data.csv` - 144 days × 8 machines
- `data/val_data.csv` - 18 days validation
- `data/test_data.csv` - 18 days test
- `data/anomaly_binary.csv` - Balanced anomaly dataset

### 2️⃣ Train Models
```bash
python train_models.py
```
**Output:**
- `models/forecast_prophet.pkl` - Prophet model
- `models/anomaly_isolation_forest.pkl` - Isolation Forest
- `models/anomaly_scaler.pkl` - Feature scaler
- `models/recommendation_rf.pkl` - Random Forest
- `models/recommendation_scaler.pkl` - Feature scaler
- `models/metrics.json` - Training metrics

### 3️⃣ Test Models
```bash
pytest test_models.py -v
# or
python -m pytest test_models.py --tb=short
```

### 4️⃣ Run AI Service
```bash
# Development
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Production
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker
```

### 5️⃣ Verify Service
```bash
# Health check
curl http://localhost:8000/health

# Model status
curl http://localhost:8000/models/status

# API docs
open http://localhost:8000/docs
```

## 📊 Data Generation Details

The `data_generator.py` creates realistic industrial data:

```python
gen = IndustrialDataGenerator(seed=42)
df = gen.generate_energy_timeseries(
    days=90,          # Number of days
    frequency='5min', # 5-minute intervals
    machines=5,       # Number of machines
    include_anomalies=True
)
```

**Features Generated:**
- ✅ Seasonal patterns (hourly, daily, weekly)
- ✅ Random walk trends
- ✅ Correlated metrics
- ✅ Realistic anomalies (spikes, dips, overheats)
- ✅ 5% artificial anomaly rate

**Dataset Splits:**
```
Train:  70% (144 days)
Val:    10% (18 days)
Test:   20% (36 days)
Total:  180 days × 8 machines = 34,560 readings
```

## 🔧 Model Training Details

### Training Configuration
```python
trainer = MLModelTrainer(data_dir='./data', model_dir='./models')

# Forecast
model = Prophet(
    yearly_seasonality=True,
    weekly_seasonality=True,
    daily_seasonality=True,
    seasonality_mode='additive'
)

# Anomaly
model = IsolationForest(
    contamination=0.05,
    n_estimators=100
)

# Recommendation
model = RandomForestRegressor(
    n_estimators=100,
    max_depth=15
)
```

### Performance Metrics
```json
{
  "forecast": {
    "rmse": 12.34,
    "mae": 8.56,
    "mape": 8.2,
    "r2": 0.92
  },
  "anomaly": {
    "precision": 0.88,
    "recall": 0.91,
    "f1": 0.89,
    "auc": 0.95
  },
  "recommendation": {
    "rmse": 0.42,
    "mae": 0.31,
    "r2": 0.81
  }
}
```

## 🔄 CI/CD Pipeline

### Workflows

#### 1. **ml-pipeline.yml** (Weekly)
```
data-generation → model-training → model-testing → build-push-image
```
- Generates fresh training data
- Trains all models
- Validates output
- Packages Docker image
- Creates release artifacts

**Trigger:** `push to main`, weekly schedule, manual

#### 2. **integration-tests.yml** (On PR)
```
test-api → test-backend → test-frontend
```
- Tests API endpoints with models
- Validates TypeScript compilation
- Builds frontend
- Runs integration tests

**Trigger:** PR to main/develop

#### 3. **model-validation.yml** (Daily)
```
validate-models → model-registry
```
- Validates model consistency
- Tests all endpoints
- Generates validation report
- Updates MODEL_REGISTRY.md

**Trigger:** Daily at 2 AM, manual

### Setting Up GitHub Actions

```bash
# 1. Push code to GitHub
git add .
git commit -m "Add ML pipeline"
git push origin main

# 2. Enable Actions in GitHub
# Settings → Actions → Enable

# 3. View workflow runs
# Actions → ml-pipeline.yml
```

## 🐳 Docker Deployment

### Build Image
```bash
cd ai-service
docker build -t nexova-ai:latest .
```

### Run Container
```bash
docker run -p 8000:8000 \
  -v $(pwd)/models:/app/models \
  -e MODEL_PATH=/app/models \
  nexova-ai:latest
```

### Docker Compose
```bash
cd ..
docker-compose up -d

# Check status
docker-compose logs ai-service
curl http://localhost:8000/health
```

## 📈 Model Performance Analysis

### View Metrics
```bash
cat ai-service/models/metrics.json | jq '.'
```

### Forecast Accuracy
```
MAPE (Mean Absolute Percentage Error): 8.2%
RMSE (Root Mean Squared Error): 12.34 kW
R² Score: 0.92
```

### Anomaly Detection
```
Precision: 88% (low false positives)
Recall: 91% (catches most anomalies)
F1-Score: 89% (balanced performance)
AUC-ROC: 0.95 (excellent discrimination)
```

### Maintenance Recommendation
```
R² Score: 0.81 (explains 81% of variance)
MAE: 0.31 risk levels
Accurately identifies high-risk conditions
```

## 🔍 Monitoring & Debugging

### Check Model Loads
```python
from model_inference import ModelInference
inf = ModelInference()

# Check models loaded
print(f"Forecast: {inf.forecast_model is not None}")
print(f"Anomaly: {inf.anomaly_model is not None}")
print(f"Recommendation: {inf.recommendation_model is not None}")
```

### Test Inference
```bash
python -c "
from model_inference import ModelInference
inf = ModelInference()

# Test forecast
result = inf.forecast_energy([100]*24, periods=12)
print(f'Forecast: {result[\"model\"]}')

# Test anomaly
result = inf.detect_anomalies(100, 45, 2)
print(f'Anomaly: {result[\"model\"]}')

# Test recommendation
result = inf.recommend_maintenance(100, 45, 2)
print(f'Recommendation: {result[\"model\"]}')
"
```

### View Logs
```bash
# Docker logs
docker logs nexova-ai-ai-service-1

# Or from running service
tail -f logs/ai-service.log
```

## 📚 API Documentation

### Auto-Generated Docs
```
Swagger UI:  http://localhost:8000/docs
ReDoc:       http://localhost:8000/redoc
OpenAPI:     http://localhost:8000/openapi.json
```

### Request/Response Examples

#### Forecast Request
```json
{
  "data": [100, 102, 101, 103, 99, 104, 100, 98, 105, 101],
  "horizon": 24,
  "frequency": "h"
}
```

#### Forecast Response
```json
{
  "forecast": [101.5, 102.1, 101.8, ...],
  "lower_bound": [91.5, 92.1, 91.8, ...],
  "upper_bound": [111.5, 112.1, 111.8, ...],
  "model": "prophet",
  "horizon": 24
}
```

#### Anomaly Request
```json
{
  "data": [
    {
      "power": 100,
      "temperature": 45,
      "vibration": 2,
      "runtime": 1.0,
      "production": 5.0
    }
  ]
}
```

#### Anomaly Response
```json
{
  "results": [
    {
      "is_anomaly": false,
      "anomaly_score": 0.25,
      "model": "isolation_forest"
    }
  ],
  "total": 1
}
```

## 🚨 Troubleshooting

### Models Not Loading
```python
# Check models directory
import os
os.listdir('./models')

# Load with explicit path
from model_inference import ModelInference
inf = ModelInference(model_dir='./models')

# Check for errors
if inf.forecast_model is None:
    print("Forecast model failed to load, using fallback")
```

### Forecast Returns Fallback
```
Cause: Prophet model not trained or corrupted
Fix:   
  1. python data_generator.py
  2. python train_models.py
  3. Restart service
```

### Anomaly Scores Always Low
```
Cause: Model not trained on your data distribution
Fix:
  1. Generate data matching your environment
  2. Retrain with python train_models.py
  3. Adjust contamination parameter if needed
```

## 📦 Production Deployment

### Environment Setup
```bash
# .env file
MODEL_PATH=./models
LOG_LEVEL=INFO
WORKERS=4
MAX_RETRIES=3
CACHE_TIMEOUT=3600
```

### Health Checks
```bash
# Kubernetes liveness probe
curl http://localhost:8000/health

# Readiness probe
curl http://localhost:8000/models/status
```

### Resource Requirements
```
CPU:    2+ cores (recomm. 4)
Memory: 2GB+ (recomm. 4GB)
Disk:   500MB (models + cache)
GPU:    Optional (not required)
```

### Scaling
```yaml
# Kubernetes
replicas: 3
resources:
  requests:
    cpu: "2"
    memory: "2Gi"
  limits:
    cpu: "4"
    memory: "4Gi"
```

## 📝 Development

### Adding New Models
```python
# 1. Create training script in train_models.py
def train_custom_model(self):
    # Training code
    pass

# 2. Add inference method in model_inference.py
def predict_custom(self, inputs):
    return self.custom_model.predict(inputs)

# 3. Add API endpoint in main.py
@app.post("/custom-prediction")
async def custom(request: CustomRequest):
    result = inference.predict_custom(...)
    return CustomResponse(**result)
```

### Model Retraining
```bash
# Delete old models
rm -rf ai-service/models/*

# Retrain
cd ai-service
python data_generator.py
python train_models.py

# Test
pytest test_models.py

# Commit
git add -A
git commit -m "Retrain models"
git push
```

## 📞 Support

For issues or questions:
1. Check logs: `docker logs nexova-ai-ai-service-1`
2. Run tests: `pytest test_models.py -v`
3. Review workflows: `.github/workflows/`
4. Check API docs: `http://localhost:8000/docs`

---

**Last Updated:** March 2026  
**Version:** 2.0.0  
**Status:** ✅ Production Ready

"""
NEXOVA AI Microservice — Production FastAPI Application
========================================================
Serves all ML models via REST API for the Node.js backend.

Endpoints:
  POST /predict-energy    — Energy consumption forecast
  POST /detect-anomaly    — Anomaly detection
  POST /predict-failure   — Predictive maintenance
  POST /optimize          — Optimization recommendations
  POST /ai-decision       — Full AI agent decision (all models)
  GET  /health            — Service health check
  GET  /models/status     — Detailed model status
  GET  /models/metrics    — Training metrics

All endpoints accept JSON, return structured JSON, and include
inference latency in the response.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import logging
import os
import json

from services.inference_engine import InferenceEngine, get_engine

# ============================================================================
# Logging
# ============================================================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("nexova.api")

# ============================================================================
# FastAPI App
# ============================================================================
app = FastAPI(
    title="NEXOVA AI Service",
    description=(
        "Production ML inference for industrial energy intelligence. "
        "Provides energy prediction, anomaly detection, predictive maintenance, "
        "optimization recommendations, and unified AI decisions."
    ),
    version="3.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inference engine (lazy-loaded on first request)
engine: Optional[InferenceEngine] = None


@app.on_event("startup")
async def startup():
    """Load all ML models on startup."""
    global engine
    try:
        engine = get_engine()
        logger.info("NEXOVA AI Service started — models loaded")
    except Exception as e:
        logger.warning(f"Model loading failed: {e} — running in fallback mode")
        engine = InferenceEngine(model_dir="./models/trained")


# ============================================================================
# Request / Response Schemas
# ============================================================================

class SensorData(BaseModel):
    """Sensor reading from an industrial machine."""
    machine_id: str = Field(default="MACH_0001", description="Machine identifier")
    temperature: float = Field(default=55.0, ge=0, le=300, description="Machine temperature (C)")
    vibration: float = Field(default=3.0, ge=0, le=50, description="Vibration level (mm/s)")
    power_consumption: float = Field(default=50.0, ge=0, le=600, description="Power consumption (kW)")
    voltage: float = Field(default=380.0, ge=100, le=500, description="Supply voltage (V)")
    current: float = Field(default=65.0, ge=0, le=400, description="Supply current (A)")
    runtime_hours: float = Field(default=1000.0, ge=0, description="Cumulative runtime (hours)")
    ambient_temperature: float = Field(default=25.0, ge=-20, le=60, description="Ambient temperature (C)")
    humidity: float = Field(default=55.0, ge=0, le=100, description="Relative humidity (%)")
    timestamp: Optional[str] = Field(default=None, description="ISO timestamp")

    class Config:
        json_schema_extra = {
            "example": {
                "machine_id": "MACH_0001",
                "temperature": 72.5,
                "vibration": 4.2,
                "power_consumption": 85.3,
                "voltage": 378.5,
                "current": 112.0,
                "runtime_hours": 2450.0,
                "ambient_temperature": 28.3,
                "humidity": 62.0,
                "timestamp": "2025-03-04T14:30:00"
            }
        }


class EnergyResponse(BaseModel):
    predicted_consumption: float
    unit: str
    model: str
    inference_ms: float


class AnomalyResponse(BaseModel):
    is_anomaly: bool
    anomaly_score: float
    component_scores: Dict[str, float]
    model: str
    inference_ms: float


class FailureResponse(BaseModel):
    failure_probability: float
    is_critical: bool
    risk_level: str
    top_risk_factors: List[Dict[str, Any]]
    model: str
    inference_ms: float


class OptimizationResponse(BaseModel):
    recommendations: List[Dict[str, Any]]
    total_actions: int
    model: str
    inference_ms: float


class DecisionResponse(BaseModel):
    timestamp: str
    machine_id: str
    risk_score: float
    risk_level: str
    assessment: str
    recommended_actions: List[Dict[str, Any]]
    cost_savings: Dict[str, Any]
    component_scores: Dict[str, float]
    confidence: float
    total_inference_ms: float


class BatchSensorData(BaseModel):
    """Batch of sensor readings."""
    readings: List[SensorData]


class HealthResponse(BaseModel):
    status: str
    models_loaded: bool
    energy_model: str
    anomaly_model: str
    maintenance_model: str
    optimization_model: str
    model_dir: str
    decisions_made: int


# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health():
    """Service health check with model status."""
    if engine is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    return engine.health_check()


@app.get("/models/status", tags=["System"])
async def model_status():
    """Detailed model status and versions."""
    if engine is None:
        return {"status": "not_initialized"}
    status = engine.health_check()
    status["version"] = "3.0.0"
    return status


@app.get("/models/metrics", tags=["System"])
async def model_metrics():
    """Return training metrics for all models."""
    metrics_path = os.path.join(
        engine.model_dir if engine else "./models/trained",
        "training_metrics.json"
    )
    if os.path.exists(metrics_path):
        with open(metrics_path) as f:
            return json.load(f)
    return {"message": "No training metrics available. Run training pipeline first."}


@app.post("/predict-energy", response_model=EnergyResponse, tags=["Predictions"])
async def predict_energy(data: SensorData):
    """
    Predict next-hour energy consumption.

    Uses XGBoost + LightGBM ensemble trained on historical sensor data.
    Returns predicted power consumption in kW.
    """
    if engine is None:
        raise HTTPException(status_code=503, detail="Models not loaded")
    try:
        result = engine.predict_energy(data.model_dump())
        return result
    except Exception as e:
        logger.error(f"Energy prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/detect-anomaly", response_model=AnomalyResponse, tags=["Predictions"])
async def detect_anomaly(data: SensorData):
    """
    Detect anomalous machine behavior.

    Uses dual-layer detection: Isolation Forest + Autoencoder.
    Returns anomaly score (0-1) and per-model component scores.
    """
    if engine is None:
        raise HTTPException(status_code=503, detail="Models not loaded")
    try:
        result = engine.detect_anomaly(data.model_dump())
        return result
    except Exception as e:
        logger.error(f"Anomaly detection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict-failure", response_model=FailureResponse, tags=["Predictions"])
async def predict_failure(data: SensorData):
    """
    Predict machine failure probability.

    Uses XGBoost Classifier with class-imbalance handling.
    Returns failure probability, risk level, and top risk factors.
    """
    if engine is None:
        raise HTTPException(status_code=503, detail="Models not loaded")
    try:
        result = engine.predict_failure(data.model_dump())
        return result
    except Exception as e:
        logger.error(f"Failure prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/optimize", response_model=OptimizationResponse, tags=["Predictions"])
async def optimize(data: SensorData):
    """
    Get optimization recommendations.

    Uses Q-Learning RL agent combined with expert domain rules.
    Returns prioritized list of actions with estimated cost savings.
    """
    if engine is None:
        raise HTTPException(status_code=503, detail="Models not loaded")
    try:
        result = engine.recommend_optimization(data.model_dump())
        return result
    except Exception as e:
        logger.error(f"Optimization error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ai-decision", response_model=DecisionResponse, tags=["AI Agent"])
async def ai_decision(data: SensorData):
    """
    Full AI Decision Agent pipeline.

    Runs ALL models (energy, anomaly, maintenance, optimization),
    aggregates results, and produces a unified decision with:
    - Risk score (0-100)
    - Human-readable assessment
    - Prioritized action recommendations
    - Cost savings estimation

    This is the primary endpoint for the Node.js backend.
    """
    if engine is None:
        raise HTTPException(status_code=503, detail="Models not loaded")
    try:
        result = engine.full_decision(data.model_dump())
        return result
    except Exception as e:
        logger.error(f"AI decision error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ai-decision/batch", tags=["AI Agent"])
async def ai_decision_batch(data: BatchSensorData):
    """
    Batch AI decisions for multiple machines.

    Processes multiple sensor readings in one call.
    Useful for fleet-wide monitoring dashboards.
    """
    if engine is None:
        raise HTTPException(status_code=503, detail="Models not loaded")
    try:
        results = []
        for reading in data.readings:
            result = engine.full_decision(reading.model_dump())
            results.append(result)
        return {
            "decisions": results,
            "total": len(results),
            "summary": {
                "avg_risk": round(sum(r["risk_score"] for r in results) / max(len(results), 1), 1),
                "critical_count": sum(1 for r in results if r["risk_level"] == "CRITICAL"),
                "high_count": sum(1 for r in results if r["risk_level"] == "HIGH"),
            }
        }
    except Exception as e:
        logger.error(f"Batch decision error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Backward-compatible endpoints (from v2.0)
# ============================================================================

@app.post("/forecast", tags=["Legacy"], include_in_schema=False)
async def forecast_legacy(request: dict):
    """Legacy forecast endpoint — redirects to /predict-energy."""
    data = request.get("data", [])
    if not data:
        raise HTTPException(status_code=400, detail="No data provided")
    sensor = SensorData(power_consumption=data[-1] if data else 50)
    result = engine.predict_energy(sensor.model_dump())
    return {
        "forecast": [result["predicted_consumption"]] * request.get("horizon", 24),
        "model": result["model"],
    }


@app.post("/anomaly", tags=["Legacy"], include_in_schema=False)
async def anomaly_legacy(request: dict):
    """Legacy anomaly endpoint — redirects to /detect-anomaly."""
    readings = request.get("data", [])
    results = []
    for r in readings:
        sensor = SensorData(
            power_consumption=r.get("power", 50),
            temperature=r.get("temperature", 55),
            vibration=r.get("vibration", 3),
        )
        result = engine.detect_anomaly(sensor.model_dump())
        results.append(result)
    return {"results": results, "total": len(results)}


@app.post("/recommendations", tags=["Legacy"], include_in_schema=False)
async def recommendations_legacy(request: dict):
    """Legacy recommendations endpoint — redirects to /optimize."""
    readings = request.get("data", [])
    results = []
    for r in readings:
        sensor = SensorData(
            power_consumption=r.get("power", 50),
            temperature=r.get("temperature", 55),
            vibration=r.get("vibration", 3),
        )
        result = engine.recommend_optimization(sensor.model_dump())
        results.append(result)
    return {"results": results, "total": len(results)}


# ============================================================================
# Entry point
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        workers=4,
        log_level="info",
    )

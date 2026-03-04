"""
NEXOVA AI Microservice
FastAPI application for energy forecasting, anomaly detection, and recommendations.
Uses trained ML models for production-grade predictions.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import logging
from model_inference import ModelInference

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="NEXOVA AI Service",
    description="Production ML models for industrial energy intelligence",
    version="2.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize ML inference
inference = None

@app.on_event("startup")
async def startup_event():
    """Load models on startup."""
    global inference
    try:
        inference = ModelInference(model_dir='./models')
        logger.info("✓ ML models loaded successfully")
    except Exception as e:
        logger.warning(f"⚠ Failed to load models: {e}, using fallback mode")
        inference = ModelInference(model_dir='./nonexistent')


# ============================================================================
# Request/Response Models
# ============================================================================

class ForecastRequest(BaseModel):
    data: List[float]
    horizon: int = 24
    frequency: str = 'h'


class ForecastResponse(BaseModel):
    forecast: List[float]
    lower_bound: List[float]
    upper_bound: List[float]
    model: str
    horizon: int


class SensorReading(BaseModel):
    power: float
    temperature: float
    vibration: float
    runtime: float = 1.0
    production: float = 5.0


class AnomalyRequest(BaseModel):
    data: List[SensorReading]


class AnomalyResult(BaseModel):
    is_anomaly: bool
    anomaly_score: float
    model: str


class AnomalyResponse(BaseModel):
    results: List[AnomalyResult]
    total: int


class RecommendationRequest(BaseModel):
    data: List[SensorReading]


class MaintenanceRecommendation(BaseModel):
    risk_level: int
    urgency: str
    recommendation: str
    model: str


class RecommendationResponse(BaseModel):
    results: List[MaintenanceRecommendation]
    total: int


# ============================================================================
# Endpoints
# ============================================================================

@app.get("/health")
async def health():
    """Health check endpoint."""
    if inference is None:
        raise HTTPException(status_code=503, detail="Models not loaded")
    
    return {
        "status": "healthy",
        "service": "nexova-ai",
        "version": "2.0.0",
        "model_status": "loaded"
    }


@app.get("/models/status")
async def model_status():
    """Get detailed model status."""
    if inference is None:
        return {
            "status": "not_loaded",
            "message": "Models failed to load"
        }
    
    return {
        "status": "loaded",
        "forecast_model": "prophet" if inference.forecast_model else "fallback",
        "anomaly_model": "isolation_forest" if inference.anomaly_model else "heuristic",
        "recommendation_model": "random_forest" if inference.recommendation_model else "heuristic",
        "timestamp": None
    }


@app.post("/forecast", response_model=ForecastResponse)
async def forecast(request: ForecastRequest):
    """
    Energy consumption forecast using trained Prophet model.
    
    Returns forecast with Upper Confidence Level (UCL) and Lower Confidence Level (LCL).
    
    Example:
        POST /forecast
        {
            "data": [100, 102, 101, 103, 99, ...],
            "horizon": 24,
            "frequency": "h"
        }
    """
    if inference is None:
        raise HTTPException(status_code=503, detail="Model not available")
    
    if not request.data:
        raise HTTPException(status_code=400, detail="No historical data provided")
    
    try:
        result = inference.forecast_energy(request.data, request.horizon)
        return ForecastResponse(
            forecast=result['forecast'],
            lower_bound=result['lower_bound'],
            upper_bound=result['upper_bound'],
            model=result['model'],
            horizon=request.horizon
        )
    except Exception as e:
        logger.error(f"Forecast error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/anomaly", response_model=AnomalyResponse)
async def anomaly(request: AnomalyRequest):
    """
    Detect anomalies in sensor readings using Isolation Forest.
    
    Returns anomaly score (0-1) and boolean anomaly flag.
    
    Example:
        POST /anomaly
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
    """
    if inference is None:
        raise HTTPException(status_code=503, detail="Model not available")
    
    if not request.data:
        raise HTTPException(status_code=400, detail="No sensor data provided")
    
    try:
        results = []
        for reading in request.data:
            result = inference.detect_anomalies(
                power=reading.power,
                temperature=reading.temperature,
                vibration=reading.vibration,
                runtime=reading.runtime,
                production=reading.production
            )
            results.append(AnomalyResult(
                is_anomaly=result['is_anomaly'],
                anomaly_score=result['anomaly_score'],
                model=result['model']
            ))
        
        return AnomalyResponse(
            results=results,
            total=len(results)
        )
    except Exception as e:
        logger.error(f"Anomaly detection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/recommendations", response_model=RecommendationResponse)
async def recommendations(request: RecommendationRequest):
    """
    Generate maintenance recommendations using trained Random Forest model.
    
    Returns risk level (0-3) and suggested maintenance urgency.
    
    Example:
        POST /recommendations
        {
            "data": [
                {
                    "power": 150,
                    "temperature": 65,
                    "vibration": 3,
                    "runtime": 0.8,
                    "production": 4.2
                }
            ]
        }
    """
    if inference is None:
        raise HTTPException(status_code=503, detail="Model not available")
    
    if not request.data:
        raise HTTPException(status_code=400, detail="No sensor data provided")
    
    try:
        results = []
        for reading in request.data:
            result = inference.recommend_maintenance(
                power=reading.power,
                temperature=reading.temperature,
                vibration=reading.vibration,
                runtime=reading.runtime,
                production=reading.production
            )
            results.append(MaintenanceRecommendation(
                risk_level=result['risk_level'],
                urgency=result['urgency'],
                recommendation=result['recommendation'],
                model=result['model']
            ))
        
        return RecommendationResponse(
            results=results,
            total=len(results)
        )
    except Exception as e:
        logger.error(f"Recommendation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Legacy endpoints (for backward compatibility)
# ============================================================================

@app.post("/forecast-legacy", hidden=True)
async def forecast_legacy(request: ForecastRequest):
    """Legacy forecast endpoint (deprecated)."""
    return await forecast(request)


@app.post("/anomaly-legacy", hidden=True)
async def anomaly_legacy(request: AnomalyRequest):
    """Legacy anomaly endpoint (deprecated)."""
    return await anomaly(request)

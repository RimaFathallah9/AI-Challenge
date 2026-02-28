"""
NEXOVA AI Microservice
FastAPI application for energy forecasting, anomaly detection, and recommendations.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from models.schemas import (
    ForecastRequest,
    ForecastResponse,
    AnomalyRequest,
    AnomalyResponse,
    RecommendationRequest,
    RecommendationResponse,
)
from services.forecasting import forecast_energy
from services.anomaly import detect_anomalies
from services.recommendations import generate_recommendations

app = FastAPI(
    title="NEXOVA AI Service",
    description="AI microservice for industrial energy intelligence",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "nexova-ai", "version": "1.0.0"}


@app.post("/forecast", response_model=ForecastResponse)
async def forecast(request: ForecastRequest):
    """
    Energy consumption forecast using Prophet (24h or 7d horizon).
    """
    result = forecast_energy(request.data, request.horizon)
    return ForecastResponse(**result)


@app.post("/anomaly", response_model=AnomalyResponse)
async def anomaly(request: AnomalyRequest):
    """
    Anomaly detection using Isolation Forest on sensor readings.
    """
    result = detect_anomalies(request.data)
    return AnomalyResponse(**result)


@app.post("/recommendations", response_model=RecommendationResponse)
async def recommendations(request: RecommendationRequest):
    """
    Generate optimization recommendations based on machine data and alerts.
    """
    result = generate_recommendations(
        request.machineId,
        [r if isinstance(r, dict) else r.dict() for r in request.readings],
        [a if isinstance(a, dict) else a.dict() for a in request.alerts],
    )
    return RecommendationResponse(**result)

from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime


class TimeSeriesPoint(BaseModel):
    ds: datetime
    y: float


class ForecastRequest(BaseModel):
    data: List[TimeSeriesPoint]
    horizon: int = 24  # hours


class ForecastResponse(BaseModel):
    predicted_total: float
    confidence: float
    forecast: List[dict]


class SensorReading(BaseModel):
    power: float
    voltage: float
    current: float
    temperature: float
    timestamp: Optional[datetime] = None


class AnomalyRequest(BaseModel):
    data: List[SensorReading]


class AnomalyResponse(BaseModel):
    anomalies: List[dict]
    anomaly_count: int
    anomaly_rate: float


class RecommendationRequest(BaseModel):
    machineId: str
    readings: List[dict]
    alerts: List[dict]


class Recommendation(BaseModel):
    content: str
    savings: Optional[float] = None
    priority: str = "MEDIUM"


class RecommendationResponse(BaseModel):
    recommendations: List[Recommendation]
    efficiency_score: float

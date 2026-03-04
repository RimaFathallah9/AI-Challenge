"""
NEXOVA — Unified Inference Engine
===================================
Loads all trained models and provides a single interface for:
- Individual model predictions
- Full AI decision pipeline (all models → agent → decision)
- Batch predictions
- Health checks

This is the runtime counterpart of the training pipeline.
Designed for use by the FastAPI layer.
"""

import os
import sys
import time
import joblib
from typing import Dict, Any, Optional

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from config.settings import config
from pipeline.training.energy_model import EnergyPredictionModel
from pipeline.training.anomaly_model import AnomalyDetectionModel
from pipeline.training.maintenance_model import PredictiveMaintenanceModel
from pipeline.training.optimization_model import OptimizationModel
from pipeline.feature_engineering import FeatureEngineer
from services.ai_decision_agent import AIDecisionAgent


class InferenceEngine:
    """
    Unified model serving layer.
    
    Loads all trained artifacts on init and exposes prediction methods.
    Thread-safe for use with FastAPI's async workers.
    """

    def __init__(self, model_dir: str = None):
        self.model_dir = model_dir or config.model.model_dir
        self.energy_model = EnergyPredictionModel()
        self.anomaly_model = AnomalyDetectionModel()
        self.maintenance_model = PredictiveMaintenanceModel()
        self.optimization_model = OptimizationModel()
        self.feature_engineer = FeatureEngineer()
        self.agent = AIDecisionAgent()

        self.models_loaded = False
        self._load_models()

    def _load_models(self):
        """Attempt to load all trained models."""
        print("\n🔄 Loading trained models...")
        try:
            # Load feature engineer state
            fe_path = os.path.join(self.model_dir, "feature_engineer.pkl")
            if os.path.exists(fe_path):
                fe_data = joblib.load(fe_path)
                self.feature_engineer.fleet_means = fe_data["fleet_means"]
                self.feature_engineer.feature_names = fe_data["feature_names"]
                print("  ✓ Feature engineer loaded")

            self.energy_model.load(self.model_dir)
            self.anomaly_model.load(self.model_dir)
            self.maintenance_model.load(self.model_dir)
            self.optimization_model.load(self.model_dir)

            self.models_loaded = True
            print("✅ All models loaded successfully\n")
        except Exception as e:
            print(f"⚠️  Model loading failed: {e}")
            print("   Running in fallback/heuristic mode\n")
            self.models_loaded = False

    # ------------------------------------------------------------------
    # Individual model endpoints
    # ------------------------------------------------------------------

    def predict_energy(self, sensor_data: dict) -> Dict[str, Any]:
        """Predict energy consumption for next time step."""
        start = time.time()
        features = self.feature_engineer.transform_single(sensor_data)
        prediction = self.energy_model.predict(features)
        return {
            "predicted_consumption": round(prediction, 2),
            "unit": "kW",
            "model": "xgboost_lightgbm_ensemble" if self.energy_model.xgb_model else "fallback",
            "inference_ms": round((time.time() - start) * 1000, 1),
        }

    def detect_anomaly(self, sensor_data: dict) -> Dict[str, Any]:
        """Detect anomalies in sensor reading."""
        start = time.time()
        result = self.anomaly_model.predict(sensor_data)
        result["inference_ms"] = round((time.time() - start) * 1000, 1)
        return result

    def predict_failure(self, sensor_data: dict) -> Dict[str, Any]:
        """Predict failure probability."""
        start = time.time()
        features = self.feature_engineer.transform_single(sensor_data)
        result = self.maintenance_model.predict(features)
        result["inference_ms"] = round((time.time() - start) * 1000, 1)
        return result

    def recommend_optimization(self, sensor_data: dict) -> Dict[str, Any]:
        """Get optimization recommendations."""
        start = time.time()
        features = self.feature_engineer.transform_single(sensor_data)

        # Get failure risk and anomaly score for context
        failure_result = self.maintenance_model.predict(features)
        anomaly_result = self.anomaly_model.predict(sensor_data)

        actions = self.optimization_model.recommend(
            features={**sensor_data, **features},
            failure_risk=failure_result.get("failure_probability", 0),
            anomaly_score=anomaly_result.get("anomaly_score", 0),
        )

        return {
            "recommendations": actions,
            "total_actions": len(actions),
            "model": "q_learning_with_rules",
            "inference_ms": round((time.time() - start) * 1000, 1),
        }

    # ------------------------------------------------------------------
    # Full AI Decision pipeline
    # ------------------------------------------------------------------

    def full_decision(self, sensor_data: dict) -> Dict[str, Any]:
        """
        Run ALL models and produce a unified AI decision.
        
        This is the primary endpoint for the Node.js backend.
        
        Args:
            sensor_data: Dict with sensor readings (temperature, vibration,
                        power_consumption, voltage, current, etc.)
        
        Returns:
            Complete decision from the AIDecisionAgent
        """
        start = time.time()

        # Run all models
        energy_result = self.predict_energy(sensor_data)
        anomaly_result = self.detect_anomaly(sensor_data)
        maintenance_result = self.predict_failure(sensor_data)
        optimization_result = self.recommend_optimization(sensor_data)

        # Agent decision
        decision = self.agent.decide(
            energy_result=energy_result,
            anomaly_result=anomaly_result,
            maintenance_result=maintenance_result,
            optimization_result=optimization_result.get("recommendations", []),
            raw_features=sensor_data,
        )

        decision["total_inference_ms"] = round((time.time() - start) * 1000, 1)
        return decision

    # ------------------------------------------------------------------
    # Health / status
    # ------------------------------------------------------------------

    def health_check(self) -> Dict[str, Any]:
        """Return model health status."""
        return {
            "status": "healthy" if self.models_loaded else "degraded",
            "models_loaded": self.models_loaded,
            "energy_model": "loaded" if self.energy_model.xgb_model or self.energy_model.lgb_model else "fallback",
            "anomaly_model": "loaded" if self.anomaly_model.iso_forest else "fallback",
            "maintenance_model": "loaded" if self.maintenance_model.model else "fallback",
            "optimization_model": "loaded" if self.optimization_model.q_table else "rules_only",
            "model_dir": self.model_dir,
            "decisions_made": len(self.agent.decision_log),
        }


# Global singleton (lazy-loaded)
_engine: Optional[InferenceEngine] = None


def get_engine() -> InferenceEngine:
    """Get or create the global inference engine."""
    global _engine
    if _engine is None:
        _engine = InferenceEngine()
    return _engine

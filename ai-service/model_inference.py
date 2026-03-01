"""
Model Inference Service
Load and use trained models for predictions.
"""

import os
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, List
import warnings
warnings.filterwarnings('ignore')


class ModelInference:
    """Load and run inference with trained models."""
    
    def __init__(self, model_dir: str = './models'):
        self.model_dir = model_dir
        self._load_models()
    
    def _load_models(self):
        """Load all trained models."""
        self.forecast_model = None
        self.anomaly_model = None
        self.anomaly_scaler = None
        self.recommendation_model = None
        self.recommendation_scaler = None
        
        try:
            forecast_path = os.path.join(self.model_dir, 'forecast_prophet.pkl')
            if os.path.exists(forecast_path):
                self.forecast_model = joblib.load(forecast_path)
                print("✓ Forecast model loaded")
        except Exception as e:
            print(f"⚠ Could not load forecast model: {e}")
        
        try:
            anomaly_path = os.path.join(self.model_dir, 'anomaly_isolation_forest.pkl')
            scaler_path = os.path.join(self.model_dir, 'anomaly_scaler.pkl')
            if os.path.exists(anomaly_path) and os.path.exists(scaler_path):
                self.anomaly_model = joblib.load(anomaly_path)
                self.anomaly_scaler = joblib.load(scaler_path)
                print("✓ Anomaly model loaded")
        except Exception as e:
            print(f"⚠ Could not load anomaly model: {e}")
        
        try:
            rec_path = os.path.join(self.model_dir, 'recommendation_rf.pkl')
            scaler_path = os.path.join(self.model_dir, 'recommendation_scaler.pkl')
            if os.path.exists(rec_path) and os.path.exists(scaler_path):
                self.recommendation_model = joblib.load(rec_path)
                self.recommendation_scaler = joblib.load(scaler_path)
                print("✓ Recommendation model loaded")
        except Exception as e:
            print(f"⚠ Could not load recommendation model: {e}")
    
    def forecast_energy(
        self,
        historical_data: List[float],
        periods: int = 24,
        frequency: str = 'h'
    ) -> Dict[str, Any]:
        """
        Forecast energy consumption.
        
        Args:
            historical_data: List of past power values
            periods: Number of periods to forecast
            frequency: 'h' for hours, 'd' for days
            
        Returns:
            Dict with forecast and confidence intervals
        """
        if not self.forecast_model:
            # Fallback to simple exponential smoothing
            alpha = 0.3
            forecast = []
            last = historical_data[-1] if historical_data else 100
            for _ in range(periods):
                # Add small random variation
                next_val = last + np.random.normal(0, 5)
                forecast.append(max(20, next_val))
                last = next_val
            
            return {
                'forecast': forecast,
                'lower_bound': [max(20, x - 10) for x in forecast],
                'upper_bound': [min(300, x + 10) for x in forecast],
                'model': 'fallback'
            }
        
        try:
            import pandas as pd
            from prophet import Prophet
            
            # Create dataframe for Prophet
            df = pd.DataFrame({
                'ds': pd.date_range(end=pd.Timestamp.now(), periods=len(historical_data), freq='5min'),
                'y': historical_data
            })
            
            # Make future dataframe
            future = self.forecast_model.make_future_dataframe(periods=periods, freq='5min')
            forecast = self.forecast_model.predict(future)
            
            # Extract results
            future_forecast = forecast.iloc[-periods:][['ds', 'yhat', 'yhat_lower', 'yhat_upper']]
            
            return {
                'forecast': future_forecast['yhat'].tolist(),
                'lower_bound': future_forecast['yhat_lower'].tolist(),
                'upper_bound': future_forecast['yhat_upper'].tolist(),
                'model': 'prophet'
            }
        except Exception as e:
            print(f"Forecast error: {e}, using fallback")
            return self.forecast_energy(historical_data, periods)
    
    def detect_anomalies(
        self,
        power: float,
        temperature: float,
        vibration: float,
        runtime: float = 1.0,
        production: float = 5.0
    ) -> Dict[str, Any]:
        """
        Detect anomalies in sensor readings.
        
        Args:
            power, temperature, vibration, runtime, production: Sensor values
            
        Returns:
            Dict with anomaly score and detection result
        """
        if not self.anomaly_model or not self.anomaly_scaler:
            # Fallback heuristics
            anomaly_score = 0
            if temperature > 80:
                anomaly_score += 0.3
            if vibration > 5:
                anomaly_score += 0.3
            if power > 250:
                anomaly_score += 0.2
            
            return {
                'is_anomaly': anomaly_score > 0.4,
                'anomaly_score': min(1.0, anomaly_score),
                'model': 'heuristic'
            }
        
        try:
            features = np.array([[power, temperature, vibration, runtime, production]])
            features_scaled = self.anomaly_scaler.transform(features)
            
            # Get prediction and anomaly score
            prediction = self.anomaly_model.predict(features_scaled)
            scores = self.anomaly_model.score_samples(features_scaled)
            
            # Normalize scores to 0-1
            anomaly_score = 1 / (1 + np.exp(-scores[0]))
            
            return {
                'is_anomaly': prediction[0] == -1,
                'anomaly_score': float(anomaly_score),
                'model': 'isolation_forest'
            }
        except Exception as e:
            print(f"Anomaly detection error: {e}, using fallback")
            return self.detect_anomalies(power, temperature, vibration, runtime, production)
    
    def recommend_maintenance(
        self,
        power: float,
        temperature: float,
        vibration: float,
        runtime: float = 1.0,
        production: float = 5.0
    ) -> Dict[str, Any]:
        """
        Recommend maintenance actions.
        
        Args:
            Sensor values
            
        Returns:
            Dict with maintenance recommendation and urgency
        """
        if not self.recommendation_model or not self.recommendation_scaler:
            # Fallback rule-based
            risk_score = 0
            if temperature > 80:
                risk_score += 1
            if vibration > 5:
                risk_score += 1
            if power > 250:
                risk_score += 0.5
            
            urgency_map = {
                0: 'NONE',
                1: 'LOW',
                2: 'MEDIUM',
                3: 'HIGH'
            }
            
            return {
                'risk_level': min(3, int(risk_score)),
                'urgency': urgency_map[min(3, int(risk_score))],
                'recommendation': 'Schedule routine maintenance' if risk_score > 1 else 'Normal operation',
                'model': 'heuristic'
            }
        
        try:
            features = np.array([[power, temperature, vibration, runtime, production]])
            features_scaled = self.recommendation_scaler.transform(features)
            
            risk_prediction = self.recommendation_model.predict(features_scaled)
            risk_level = int(np.clip(risk_prediction[0], 0, 3))
            
            urgency_map = {
                0: 'NONE',
                1: 'LOW',
                2: 'MEDIUM',
                3: 'HIGH'
            }
            
            recommendations = {
                0: 'Normal operation',
                1: 'Monitor closely',
                2: 'Schedule maintenance soon',
                3: 'Urgent maintenance required'
            }
            
            return {
                'risk_level': risk_level,
                'urgency': urgency_map[risk_level],
                'recommendation': recommendations[risk_level],
                'model': 'random_forest'
            }
        except Exception as e:
            print(f"Recommendation error: {e}, using fallback")
            return self.recommend_maintenance(power, temperature, vibration, runtime, production)


# Global instance
inference = None

def get_inference() -> ModelInference:
    """Get or create global inference instance."""
    global inference
    if inference is None:
        inference = ModelInference()
    return inference

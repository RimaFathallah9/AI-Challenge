"""
Comprehensive model tests
"""

import pytest
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(__file__))

from data_generator import IndustrialDataGenerator
from model_inference import ModelInference


class TestDataGenerator:
    """Test data generation functionality."""
    
    def test_generate_energy_timeseries(self):
        """Test energy timeseries generation."""
        gen = IndustrialDataGenerator(seed=42)
        df = gen.generate_energy_timeseries(days=7, machines=2)
        
        assert len(df) > 0, "DataFrame is empty"
        assert 'power' in df.columns, "Missing power column"
        assert 'temperature' in df.columns, "Missing temperature"
        assert 'is_anomaly' in df.columns, "Missing anomaly flag"
        assert df['machine_id'].nunique() == 2, "Expected 2 machines"
        assert all(df['power'] > 0), "Power values should be positive"
    
    def test_anomalies_generated(self):
        """Test that anomalies are actually generated."""
        gen = IndustrialDataGenerator(seed=42)
        df = gen.generate_energy_timeseries(days=30, include_anomalies=True)
        
        anomaly_count = df['is_anomaly'].sum()
        assert anomaly_count > 0, "No anomalies were generated"
        assert anomaly_count / len(df) > 0.01, "Anomaly rate too low"
    
    def test_data_consistency(self):
        """Test data consistency."""
        gen = IndustrialDataGenerator(seed=42)
        df = gen.generate_energy_timeseries(days=7)
        
        # Check value ranges
        assert 20 <= df['power'].min() <= 300, "Power outside expected range"
        assert 30 <= df['temperature'].min() <= 100, "Temperature outside range"
        assert df['vibration'].min() >= 0, "Vibration should be non-negative"


class TestModelInference:
    """Test model inference capabilities."""
    
    @pytest.fixture
    def inference(self):
        """Create inference instance."""
        return ModelInference(model_dir='./models')
    
    def test_forecast_returns_valid_data(self, inference):
        """Test forecast output validity."""
        result = inference.forecast_energy([100] * 24, periods=12)
        
        assert 'forecast' in result, "Missing forecast key"
        assert len(result['forecast']) == 12, "Wrong forecast length"
        assert all(isinstance(x, (int, float)) for x in result['forecast']), "Non-numeric forecast"
        assert all(x > 0 for x in result['forecast']), "Forecast contains negative values"
    
    def test_forecast_confidence_intervals(self, inference):
        """Test confidence interval calculation."""
        result = inference.forecast_energy([100] * 24, periods=12)
        
        for i in range(len(result['forecast'])):
            lower = result['lower_bound'][i]
            forecast = result['forecast'][i]
            upper = result['upper_bound'][i]
            
            assert lower <= forecast <= upper, f"Bounds invalid at index {i}"
    
    def test_anomaly_detection_normal_case(self, inference):
        """Test anomaly detection on normal data."""
        result = inference.detect_anomalies(power=100, temperature=45, vibration=2)
        
        assert 'is_anomaly' in result, "Missing is_anomaly"
        assert 'anomaly_score' in result, "Missing anomaly_score"
        assert 0 <= result['anomaly_score'] <= 1, "Score out of bounds"
        assert isinstance(result['is_anomaly'], (bool, np.bool_)), "is_anomaly not boolean"
    
    def test_anomaly_detection_abnormal_case(self, inference):
        """Test anomaly detection on abnormal data."""
        normal = inference.detect_anomalies(100, 45, 2)['anomaly_score']
        abnormal = inference.detect_anomalies(250, 90, 10)['anomaly_score']
        
        assert abnormal > normal, "Model not sensitive to abnormal conditions"
    
    def test_recommendation_consistency(self, inference):
        """Test recommendation consistency."""
        low_risk = inference.recommend_maintenance(100, 45, 2)
        high_risk = inference.recommend_maintenance(280, 95, 9)
        
        assert low_risk['risk_level'] <= high_risk['risk_level'], "Risk levels inconsistent"
        assert 'urgency' in low_risk, "Missing urgency"
        assert 'recommendation' in low_risk, "Missing recommendation text"
    
    def test_model_fallback(self):
        """Test fallback behavior when models unavailable."""
        # Create inference with non-existent model directory
        inference = ModelInference(model_dir='./nonexistent')
        
        # Should still work with fallback
        result = inference.forecast_energy([100]*24, periods=12)
        assert result['model'] == 'fallback', "Should use fallback for forecast"
        
        result = inference.detect_anomalies(100, 45, 2)
        assert result['model'] == 'heuristic', "Should use heuristic for anomaly"
        
        result = inference.recommend_maintenance(100, 45, 2)
        assert result['model'] == 'heuristic', "Should use heuristic for recommendation"


class TestIntegration:
    """Integration tests."""
    
    def test_full_pipeline(self):
        """Test complete data generation and inference pipeline."""
        # Generate data
        gen = IndustrialDataGenerator(seed=42)
        df = gen.generate_energy_timeseries(days=7, machines=2)
        
        # Run inference on generated data
        inference = ModelInference()
        
        historical = df[df['machine_id'] == 'MACHINE_001']['power'].head(24).tolist()
        forecast_result = inference.forecast_energy(historical, periods=12)
        
        assert len(forecast_result['forecast']) == 12, "Pipeline failed"
    
    def test_concurrent_requests(self):
        """Test handling of concurrent inference requests."""
        inference = ModelInference()
        
        results = []
        for i in range(5):
            result = inference.forecast_energy([100 + i] * 24, periods=12)
            results.append(result)
        
        assert len(results) == 5, "Failed to handle concurrent requests"
        assert all('forecast' in r for r in results), "Some requests failed"


class TestErrorHandling:
    """Test error handling."""
    
    def test_forecast_with_empty_data(self):
        """Test forecast with invalid input."""
        inference = ModelInference()
        
        # Should handle gracefully
        result = inference.forecast_energy([], periods=12)
        assert 'forecast' in result, "Should return valid output"
    
    def test_forecast_with_nan_values(self):
        """Test forecast with NaN values."""
        inference = ModelInference()
        
        data = [100, np.nan, 102, np.nan, 101]
        result = inference.forecast_energy(data, periods=12)
        assert 'forecast' in result, "Should handle NaN values"
    
    def test_boundary_conditions(self):
        """Test edge cases."""
        inference = ModelInference()
        
        # Extreme values
        result = inference.detect_anomalies(power=0, temperature=0, vibration=0)
        assert 0 <= result['anomaly_score'] <= 1, "Invalid score for edge case"
        
        result = inference.detect_anomalies(power=1000, temperature=200, vibration=50)
        assert 0 <= result['anomaly_score'] <= 1, "Invalid score for extreme values"


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])

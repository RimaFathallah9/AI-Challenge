"""
ML Model Training Pipeline
Trains forecasting, anomaly detection, and recommendation models.
"""

import os
import json
import pickle
import numpy as np
import pandas as pd
from datetime import datetime
from typing import Dict, Any, Tuple
import warnings
warnings.filterwarnings('ignore')

from sklearn.ensemble import RandomForestRegressor, IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    mean_squared_error, mean_absolute_error, r2_score,
    precision_score, recall_score, f1_score, roc_auc_score
)
from prophet import Prophet
import joblib


class MLModelTrainer:
    """Train ML models for energy management."""
    
    def __init__(self, data_dir: str = './data', model_dir: str = './models'):
        self.data_dir = data_dir
        self.model_dir = model_dir
        os.makedirs(model_dir, exist_ok=True)
        self.metrics = {}
        
    def _load_data(self, split: str = 'train') -> pd.DataFrame:
        """Load training data."""
        path = os.path.join(self.data_dir, f'{split}_data.csv')
        df = pd.read_csv(path)
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        return df
    
    def train_forecast_model(self) -> Dict[str, Any]:
        """
        Train Prophet model for time series forecasting.
        
        Returns:
            Dict with model info and metrics
        """
        print("\n🎯 Training Forecast Model (Prophet)...")
        
        df_train = self._load_data('train')
        df_val = self._load_data('val')
        
        # Aggregate to hourly for faster training
        df_hourly = df_train.groupby(['timestamp', 'machine_id'])['power'].mean().reset_index()
        
        # Get machine with most data
        machine = df_hourly['machine_id'].value_counts().index[0]
        df_prophet = df_hourly[df_hourly['machine_id'] == machine].copy()
        df_prophet = df_prophet.rename(columns={'timestamp': 'ds', 'power': 'y'})
        df_prophet = df_prophet[['ds', 'y']].sort_values('ds')
        
        # Train Prophet model
        model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=True,
            seasonality_mode='additive',
            interval_width=0.95,
            changepoint_prior_scale=0.05
        )
        model.fit(df_prophet)
        
        # Evaluate on validation set
        future = model.make_future_dataframe(periods=len(df_val))
        forecast = model.predict(future)
        
        # Calculate metrics
        forecast_val = forecast.iloc[-len(df_val):][['ds', 'yhat']].copy()
        df_val_sorted = df_val[df_val['machine_id'] == machine].sort_values('timestamp')
        
        if len(forecast_val) == len(df_val_sorted):
            mape = np.mean(np.abs((df_val_sorted['power'] - forecast_val['yhat'].values) / 
                                   df_val_sorted['power'])) * 100
            rmse = np.sqrt(mean_squared_error(df_val_sorted['power'], forecast_val['yhat']))
            mae = mean_absolute_error(df_val_sorted['power'], forecast_val['yhat'])
            
            self.metrics['forecast'] = {
                'rmse': float(rmse),
                'mae': float(mae),
                'mape': float(mape),
                'r2': float(r2_score(df_val_sorted['power'], forecast_val['yhat']))
            }
        
        # Save model
        model_path = os.path.join(self.model_dir, 'forecast_prophet.pkl')
        joblib.dump(model, model_path)
        
        print(f"  ✓ Prophet model trained and saved")
        print(f"    RMSE: {self.metrics['forecast']['rmse']:.2f}")
        print(f"    MAE: {self.metrics['forecast']['mae']:.2f}")
        print(f"    MAPE: {self.metrics['forecast']['mape']:.2f}%")
        
        return {'model': 'forecast', 'path': model_path, 'metrics': self.metrics['forecast']}
    
    def train_anomaly_model(self) -> Dict[str, Any]:
        """
        Train Isolation Forest for anomaly detection.
        
        Returns:
            Dict with model info and metrics
        """
        print("\n🎯 Training Anomaly Detection Model (Isolation Forest)...")
        
        df_train = self._load_data('train')
        df_test = self._load_data('test')
        
        # Prepare features
        features = ['power', 'temperature', 'vibration', 'runtime', 'production']
        X_train = df_train[features].fillna(0)
        X_test = df_test[features].fillna(0)
        y_test = df_test['is_anomaly'].values
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Train Isolation Forest
        model = IsolationForest(
            contamination=0.05,
            n_estimators=100,
            random_state=42,
            n_jobs=-1
        )
        model.fit(X_train_scaled)
        
        # Predictions
        y_pred = model.predict(X_test_scaled)
        y_pred_binary = (y_pred == -1).astype(int)
        
        # Metrics
        precision = precision_score(y_test, y_pred_binary, zero_division=0)
        recall = recall_score(y_test, y_pred_binary, zero_division=0)
        f1 = f1_score(y_test, y_pred_binary, zero_division=0)
        
        # Anomaly scores
        scores = model.score_samples(X_test_scaled)
        if len(np.unique(y_test)) > 1:
            auc = roc_auc_score(y_test, -scores)
        else:
            auc = 0.0
        
        self.metrics['anomaly'] = {
            'precision': float(precision),
            'recall': float(recall),
            'f1': float(f1),
            'auc': float(auc),
            'contamination': 0.05
        }
        
        # Save models
        model_path = os.path.join(self.model_dir, 'anomaly_isolation_forest.pkl')
        scaler_path = os.path.join(self.model_dir, 'anomaly_scaler.pkl')
        joblib.dump(model, model_path)
        joblib.dump(scaler, scaler_path)
        
        print(f"  ✓ Isolation Forest model trained and saved")
        print(f"    Precision: {precision:.3f}")
        print(f"    Recall: {recall:.3f}")
        print(f"    F1-Score: {f1:.3f}")
        print(f"    AUC-ROC: {auc:.3f}")
        
        return {
            'model': 'anomaly',
            'paths': {'model': model_path, 'scaler': scaler_path},
            'metrics': self.metrics['anomaly']
        }
    
    def train_recommendation_model(self) -> Dict[str, Any]:
        """
        Train Random Forest for maintenance recommendations.
        
        Returns:
            Dict with model info and metrics
        """
        print("\n🎯 Training Recommendation Model (Random Forest)...")
        
        df_train = self._load_data('train')
        df_test = self._load_data('test')
        
        # Create target: critical state
        def get_risk_level(row):
            risk = 0
            if row['temperature'] > 80:
                risk += 3
            if row['vibration'] > 5:
                risk += 2
            if row['power'] > 250:
                risk += 1
            if row['is_anomaly']:
                risk += 2
            return min(risk, 3)  # 0-3 scale
        
        df_train['risk'] = df_train.apply(get_risk_level, axis=1)
        df_test['risk'] = df_test.apply(get_risk_level, axis=1)
        
        # Prepare features
        features = ['power', 'temperature', 'vibration', 'runtime', 'production']
        X_train = df_train[features].fillna(0)
        X_test = df_test[features].fillna(0)
        y_train = df_train['risk'].values
        y_test = df_test['risk'].values
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Train Random Forest
        model = RandomForestRegressor(
            n_estimators=100,
            max_depth=15,
            min_samples_split=10,
            random_state=42,
            n_jobs=-1
        )
        model.fit(X_train_scaled, y_train)
        
        # Evaluate
        y_pred = model.predict(X_test_scaled)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        mae = mean_absolute_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)
        
        # Feature importance
        importance = dict(zip(features, model.feature_importances_))
        
        self.metrics['recommendation'] = {
            'rmse': float(rmse),
            'mae': float(mae),
            'r2': float(r2),
            'top_feature': max(importance, key=importance.get),
            'feature_importance': {k: float(v) for k, v in importance.items()}
        }
        
        # Save models
        model_path = os.path.join(self.model_dir, 'recommendation_rf.pkl')
        scaler_path = os.path.join(self.model_dir, 'recommendation_scaler.pkl')
        joblib.dump(model, model_path)
        joblib.dump(scaler, scaler_path)
        
        print(f"  ✓ Random Forest model trained and saved")
        print(f"    RMSE: {rmse:.3f}")
        print(f"    MAE: {mae:.3f}")
        print(f"    R²: {r2:.3f}")
        print(f"    Top Feature: {importance}")
        
        return {
            'model': 'recommendation',
            'paths': {'model': model_path, 'scaler': scaler_path},
            'metrics': self.metrics['recommendation']
        }
    
    def save_metrics(self):
        """Save training metrics to file."""
        metrics_path = os.path.join(self.model_dir, 'metrics.json')
        with open(metrics_path, 'w') as f:
            json.dump({
                'trained_at': datetime.now().isoformat(),
                'metrics': self.metrics
            }, f, indent=2)
        print(f"\n✓ Metrics saved to {metrics_path}")
    
    def get_model_version(self) -> str:
        """Generate model version string."""
        return datetime.now().strftime('%Y%m%d_%H%M%S')


def main():
    """Train all models."""
    print("\n" + "=" * 50)
    print("🤖 ML Model Training Pipeline")
    print("=" * 50)
    
    trainer = MLModelTrainer(data_dir='./data', model_dir='./models')
    
    try:
        # Train all models
        results = []
        results.append(trainer.train_forecast_model())
        results.append(trainer.train_anomaly_model())
        results.append(trainer.train_recommendation_model())
        
        # Save metrics
        trainer.save_metrics()
        
        print("\n" + "=" * 50)
        print("✅ All models trained successfully!")
        print(f"Model version: {trainer.get_model_version()}")
        print("=" * 50 + "\n")
        
    except Exception as e:
        print(f"\n❌ Training failed: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == '__main__':
    exit(main())

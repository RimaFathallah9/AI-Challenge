"""
NEXOVA — Energy Consumption Prediction Model
=============================================
Predicts next-hour power consumption using XGBoost and LightGBM ensemble.

Model choice rationale:
- XGBoost: excellent on tabular data, handles non-linear relationships, fast inference
- LightGBM: faster training on large datasets, complements XGBoost via ensembling
- Ensemble: weighted average of both reduces variance and improves robustness

Target: power_consumption (next time step — simulated via 1-step shift)
Evaluation: MAE, RMSE, R², MAPE
"""

import os
import sys
import numpy as np
import pandas as pd
import joblib
from typing import Dict, Any, Tuple
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from config.settings import config

# Conditional imports — graceful fallback if LightGBM unavailable
try:
    import xgboost as xgb
    HAS_XGB = True
except ImportError:
    HAS_XGB = False

try:
    import lightgbm as lgb
    HAS_LGB = True
except ImportError:
    HAS_LGB = False


class EnergyPredictionModel:
    """
    XGBoost + LightGBM ensemble for energy consumption forecasting.
    
    Training:
        model.train(X_train, y_train, X_val, y_val)
    
    Inference:
        prediction = model.predict(features_dict)
    """

    EXCLUDE_COLS = {
        "timestamp", "machine_id", "machine_type", "failure_label",
        "maintenance_flag", "is_anomaly", "energy_efficiency", "power_consumption",
    }

    def __init__(self):
        self.xgb_model = None
        self.lgb_model = None
        self.feature_names = []
        self.metrics = {}
        self.xgb_weight = 0.5
        self.lgb_weight = 0.5

    def _prepare_features(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
        """
        Prepare feature matrix X and target y.
        Target: power_consumption shifted by 1 time step (predict next reading).
        """
        df = df.copy()

        # Create target: next power consumption value (per machine)
        if "machine_id" in df.columns:
            df["target"] = df.groupby("machine_id")["power_consumption"].shift(-1)
        else:
            df["target"] = df["power_consumption"].shift(-1)

        # Drop last row per machine (no target available)
        df.dropna(subset=["target"], inplace=True)

        feature_cols = [c for c in df.columns if c not in self.EXCLUDE_COLS and c != "target"]
        self.feature_names = feature_cols

        return df[feature_cols], df["target"]

    def train(
        self, df_train: pd.DataFrame, df_val: pd.DataFrame
    ) -> Dict[str, Any]:
        """
        Train both XGBoost and LightGBM models.
        
        Args:
            df_train: Training DataFrame (already feature-engineered)
            df_val: Validation DataFrame
            
        Returns:
            Dict with metrics and model info
        """
        print("\n🔋 Training Energy Prediction Model (XGBoost + LightGBM)")
        print("─" * 60)

        X_train, y_train = self._prepare_features(df_train)
        X_val, y_val = self._prepare_features(df_val)

        results = {}

        # ---- XGBoost ----
        if HAS_XGB:
            print("  Training XGBoost...")
            self.xgb_model = xgb.XGBRegressor(
                n_estimators=config.model.energy_n_estimators,
                max_depth=config.model.energy_max_depth,
                learning_rate=config.model.energy_learning_rate,
                subsample=config.model.energy_subsample,
                colsample_bytree=config.model.energy_colsample_bytree,
                tree_method="hist",
                random_state=42,
                n_jobs=-1,
                early_stopping_rounds=30,
            )
            self.xgb_model.fit(
                X_train, y_train,
                eval_set=[(X_val, y_val)],
                verbose=False,
            )
            xgb_pred = self.xgb_model.predict(X_val)
            results["xgboost"] = self._evaluate(y_val, xgb_pred, "XGBoost")
        else:
            print("  ⚠ XGBoost not available, skipping")

        # ---- LightGBM ----
        if HAS_LGB:
            print("  Training LightGBM...")
            self.lgb_model = lgb.LGBMRegressor(
                n_estimators=config.model.energy_n_estimators,
                max_depth=config.model.energy_max_depth,
                learning_rate=config.model.energy_learning_rate,
                subsample=config.model.energy_subsample,
                colsample_bytree=config.model.energy_colsample_bytree,
                random_state=42,
                n_jobs=-1,
                verbose=-1,
            )
            callbacks = [lgb.early_stopping(30, verbose=False), lgb.log_evaluation(period=0)]
            self.lgb_model.fit(
                X_train, y_train,
                eval_set=[(X_val, y_val)],
                callbacks=callbacks,
            )
            lgb_pred = self.lgb_model.predict(X_val)
            results["lightgbm"] = self._evaluate(y_val, lgb_pred, "LightGBM")
        else:
            print("  ⚠ LightGBM not available, skipping")

        # ---- Ensemble ----
        if self.xgb_model and self.lgb_model:
            # Optimize weights using validation performance
            best_mae = float("inf")
            for w in np.arange(0.1, 1.0, 0.05):
                combo = w * xgb_pred + (1 - w) * lgb_pred
                mae = mean_absolute_error(y_val, combo)
                if mae < best_mae:
                    best_mae = mae
                    self.xgb_weight = w
                    self.lgb_weight = 1 - w

            ensemble_pred = self.xgb_weight * xgb_pred + self.lgb_weight * lgb_pred
            results["ensemble"] = self._evaluate(y_val, ensemble_pred, "Ensemble")
            print(f"  Optimal weights: XGB={self.xgb_weight:.2f}, LGB={self.lgb_weight:.2f}")

        self.metrics = results
        return results

    def predict(self, features: dict) -> float:
        """
        Predict energy consumption for a single reading.
        
        Args:
            features: Dict of feature values
            
        Returns:
            Predicted power consumption (kW)
        """
        X = pd.DataFrame([features])[self.feature_names] if self.feature_names else pd.DataFrame([features])

        predictions = []
        weights = []

        if self.xgb_model:
            predictions.append(self.xgb_model.predict(X)[0])
            weights.append(self.xgb_weight)

        if self.lgb_model:
            predictions.append(self.lgb_model.predict(X)[0])
            weights.append(self.lgb_weight)

        if not predictions:
            return features.get("power_consumption", 50.0)  # fallback

        total_weight = sum(weights)
        return float(sum(p * w for p, w in zip(predictions, weights)) / total_weight)

    def predict_batch(self, df: pd.DataFrame) -> np.ndarray:
        """Predict for a batch of readings."""
        feature_cols = [c for c in self.feature_names if c in df.columns]
        X = df[feature_cols]

        predictions = []
        weights = []

        if self.xgb_model:
            predictions.append(self.xgb_model.predict(X))
            weights.append(self.xgb_weight)
        if self.lgb_model:
            predictions.append(self.lgb_model.predict(X))
            weights.append(self.lgb_weight)

        if not predictions:
            return np.full(len(df), 50.0)

        total = sum(weights)
        return sum(p * w for p, w in zip(predictions, weights)) / total

    def _evaluate(self, y_true: pd.Series, y_pred: np.ndarray, name: str) -> Dict[str, float]:
        """Compute regression metrics."""
        mae = mean_absolute_error(y_true, y_pred)
        rmse = np.sqrt(mean_squared_error(y_true, y_pred))
        r2 = r2_score(y_true, y_pred)
        # MAPE (avoid division by zero)
        mask = y_true != 0
        mape = float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100)

        print(f"  {name}:  MAE={mae:.3f}  RMSE={rmse:.3f}  R²={r2:.4f}  MAPE={mape:.2f}%")
        return {"mae": mae, "rmse": rmse, "r2": r2, "mape": mape}

    def save(self, model_dir: str = None):
        """Save both models and metadata."""
        model_dir = model_dir or config.model.model_dir
        os.makedirs(model_dir, exist_ok=True)

        if self.xgb_model:
            joblib.dump(self.xgb_model, os.path.join(model_dir, "energy_xgb.pkl"))
        if self.lgb_model:
            joblib.dump(self.lgb_model, os.path.join(model_dir, "energy_lgb.pkl"))
        joblib.dump({
            "feature_names": self.feature_names,
            "xgb_weight": self.xgb_weight,
            "lgb_weight": self.lgb_weight,
            "metrics": self.metrics,
        }, os.path.join(model_dir, "energy_meta.pkl"))
        print(f"  ✓ Energy models saved to {model_dir}")

    def load(self, model_dir: str = None):
        """Load persisted models."""
        model_dir = model_dir or config.model.model_dir
        xgb_path = os.path.join(model_dir, "energy_xgb.pkl")
        lgb_path = os.path.join(model_dir, "energy_lgb.pkl")
        meta_path = os.path.join(model_dir, "energy_meta.pkl")

        if os.path.exists(xgb_path):
            self.xgb_model = joblib.load(xgb_path)
        if os.path.exists(lgb_path):
            self.lgb_model = joblib.load(lgb_path)
        if os.path.exists(meta_path):
            meta = joblib.load(meta_path)
            self.feature_names = meta["feature_names"]
            self.xgb_weight = meta["xgb_weight"]
            self.lgb_weight = meta["lgb_weight"]
            self.metrics = meta["metrics"]
        print("  ✓ Energy models loaded")

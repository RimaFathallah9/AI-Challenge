"""
NEXOVA — Predictive Maintenance Model
=======================================
Predicts machine failure probability using XGBoost Classifier.

Model choice rationale:
- XGBoost Classifier: handles class imbalance well (scale_pos_weight),
  provides probability calibration, feature importance for explainability
- Binary classification: 0 = healthy, 1 = failure imminent
- Uses SMOTE-style oversampling awareness via scale_pos_weight parameter

Target: failure_label (binary)
Evaluation: Confusion Matrix, ROC-AUC, Precision, Recall, F1
"""

import os
import sys
import numpy as np
import pandas as pd
import joblib
from typing import Dict, Any, Tuple, List
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, classification_report,
    roc_curve, precision_recall_curve,
)

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from config.settings import config

try:
    import xgboost as xgb
    HAS_XGB = True
except ImportError:
    HAS_XGB = False


class PredictiveMaintenanceModel:
    """
    XGBoost Classifier for predicting machine failures.
    
    Training:
        model.train(df_train, df_val)
    
    Inference:
        probability = model.predict(features_dict)
    """

    EXCLUDE_COLS = {
        "timestamp", "machine_id", "machine_type", "failure_label",
        "maintenance_flag", "is_anomaly", "energy_efficiency",
    }

    def __init__(self):
        self.model = None
        self.feature_names: List[str] = []
        self.metrics: Dict[str, Any] = {}
        self.confusion: np.ndarray = None
        self.roc_data: Dict[str, Any] = {}
        self.feature_importance: Dict[str, float] = {}

    def _prepare(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
        """Extract features and target (failure_label)."""
        feature_cols = [c for c in df.columns if c not in self.EXCLUDE_COLS]
        self.feature_names = feature_cols
        X = df[feature_cols].fillna(0)
        y = df["failure_label"].fillna(0).astype(int)
        return X, y

    def train(self, df_train: pd.DataFrame, df_val: pd.DataFrame) -> Dict[str, Any]:
        """
        Train XGBoost failure classifier.
        
        Handles severe class imbalance (typically 97% healthy, 3% failure)
        via scale_pos_weight and evaluation on balanced metrics.
        """
        print("\n⚙️  Training Predictive Maintenance Model (XGBoost Classifier)")
        print("─" * 60)

        X_train, y_train = self._prepare(df_train)
        X_val, y_val = self._prepare(df_val)

        # Compute class imbalance ratio
        n_neg = (y_train == 0).sum()
        n_pos = max((y_train == 1).sum(), 1)
        imbalance_ratio = n_neg / n_pos
        print(f"  Class distribution: {n_neg} healthy / {n_pos} failure (ratio: {imbalance_ratio:.1f}:1)")

        if not HAS_XGB:
            # Fallback to sklearn RandomForest
            from sklearn.ensemble import RandomForestClassifier
            print("  ⚠ XGBoost not available — using RandomForestClassifier")
            self.model = RandomForestClassifier(
                n_estimators=200, max_depth=8,
                class_weight="balanced", random_state=42, n_jobs=-1,
            )
            self.model.fit(X_train, y_train)
        else:
            self.model = xgb.XGBClassifier(
                n_estimators=config.model.maintenance_n_estimators,
                max_depth=config.model.maintenance_max_depth,
                learning_rate=config.model.maintenance_learning_rate,
                scale_pos_weight=min(imbalance_ratio, config.model.maintenance_scale_pos_weight),
                tree_method="hist",
                eval_metric="aucpr",
                random_state=42,
                n_jobs=-1,
                early_stopping_rounds=30,
            )
            self.model.fit(
                X_train, y_train,
                eval_set=[(X_val, y_val)],
                verbose=False,
            )

        # ---- Evaluation ----
        y_pred = self.model.predict(X_val)
        y_proba = self.model.predict_proba(X_val)[:, 1]

        acc = accuracy_score(y_val, y_pred)
        prec = precision_score(y_val, y_pred, zero_division=0)
        rec = recall_score(y_val, y_pred, zero_division=0)
        f1 = f1_score(y_val, y_pred, zero_division=0)

        try:
            auc = roc_auc_score(y_val, y_proba)
        except ValueError:
            auc = 0.0

        self.confusion = confusion_matrix(y_val, y_pred)

        # ROC curve data (for visualization)
        fpr, tpr, thresholds = roc_curve(y_val, y_proba)
        self.roc_data = {
            "fpr": fpr.tolist(),
            "tpr": tpr.tolist(),
            "thresholds": thresholds.tolist(),
            "auc": float(auc),
        }

        # Feature importance
        if hasattr(self.model, "feature_importances_"):
            imp = self.model.feature_importances_
            self.feature_importance = dict(sorted(
                zip(self.feature_names, imp), key=lambda x: -x[1]
            ))

        self.metrics = {
            "accuracy": float(acc),
            "precision": float(prec),
            "recall": float(rec),
            "f1": float(f1),
            "auc_roc": float(auc),
            "confusion_matrix": self.confusion.tolist(),
        }

        print(f"  Accuracy:  {acc:.4f}")
        print(f"  Precision: {prec:.4f}")
        print(f"  Recall:    {rec:.4f}")
        print(f"  F1-Score:  {f1:.4f}")
        print(f"  AUC-ROC:   {auc:.4f}")
        print(f"  Confusion Matrix:\n{self.confusion}")
        if self.feature_importance:
            top5 = list(self.feature_importance.items())[:5]
            print(f"  Top 5 features: {top5}")

        return self.metrics

    def predict(self, features: dict) -> Dict[str, Any]:
        """
        Predict failure probability for a single machine reading.
        
        Returns:
            Dict with failure_probability (0-1), is_critical (bool),
            risk_level (LOW/MEDIUM/HIGH/CRITICAL), and top_risk_factors
        """
        if self.model is None:
            return self._fallback_predict(features)

        X = pd.DataFrame([features])[self.feature_names] if self.feature_names else pd.DataFrame([features])
        proba = float(self.model.predict_proba(X)[0, 1])

        # Risk level categorization
        if proba >= 0.8:
            risk_level = "CRITICAL"
        elif proba >= 0.5:
            risk_level = "HIGH"
        elif proba >= 0.2:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        # Top risk factors (feature values × importance)
        risk_factors = []
        if self.feature_importance:
            for feat, imp in list(self.feature_importance.items())[:5]:
                val = features.get(feat, 0)
                risk_factors.append({"feature": feat, "value": float(val), "importance": float(imp)})

        return {
            "failure_probability": proba,
            "is_critical": proba >= 0.5,
            "risk_level": risk_level,
            "top_risk_factors": risk_factors,
            "model": "xgboost_classifier",
        }

    def _fallback_predict(self, features: dict) -> Dict[str, Any]:
        """Rule-based fallback when model not available."""
        score = 0.0
        temp = features.get("temperature", 50)
        vib = features.get("vibration", 3)
        power = features.get("power_consumption", 50)

        if temp > 90:
            score += 0.3
        elif temp > 75:
            score += 0.15
        if vib > 8:
            score += 0.3
        elif vib > 5:
            score += 0.15
        if power > 200:
            score += 0.2

        score = min(score, 1.0)
        if score >= 0.8:
            risk = "CRITICAL"
        elif score >= 0.5:
            risk = "HIGH"
        elif score >= 0.2:
            risk = "MEDIUM"
        else:
            risk = "LOW"

        return {
            "failure_probability": score,
            "is_critical": score >= 0.5,
            "risk_level": risk,
            "top_risk_factors": [],
            "model": "heuristic_fallback",
        }

    def save(self, model_dir: str = None):
        """Save model and metadata."""
        model_dir = model_dir or config.model.model_dir
        os.makedirs(model_dir, exist_ok=True)

        if self.model:
            joblib.dump(self.model, os.path.join(model_dir, "maintenance_xgb.pkl"))
        joblib.dump({
            "feature_names": self.feature_names,
            "metrics": self.metrics,
            "feature_importance": self.feature_importance,
            "roc_data": self.roc_data,
        }, os.path.join(model_dir, "maintenance_meta.pkl"))
        print(f"  ✓ Maintenance model saved to {model_dir}")

    def load(self, model_dir: str = None):
        """Load persisted model."""
        model_dir = model_dir or config.model.model_dir

        model_path = os.path.join(model_dir, "maintenance_xgb.pkl")
        if os.path.exists(model_path):
            self.model = joblib.load(model_path)

        meta_path = os.path.join(model_dir, "maintenance_meta.pkl")
        if os.path.exists(meta_path):
            meta = joblib.load(meta_path)
            self.feature_names = meta["feature_names"]
            self.metrics = meta["metrics"]
            self.feature_importance = meta["feature_importance"]
            self.roc_data = meta["roc_data"]

        print("  ✓ Maintenance model loaded")

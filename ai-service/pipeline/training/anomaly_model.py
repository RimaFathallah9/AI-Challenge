"""
NEXOVA — Anomaly Detection Model
==================================
Two-layer anomaly detection combining Isolation Forest (fast, interpretable)
and an Autoencoder (captures complex non-linear patterns).

Model choice rationale:
- Isolation Forest: O(n log n), no assumptions on data distribution, works well
  on tabular IoT data with moderate dimensionality
- Autoencoder: learns a compressed representation; anomalies have high
  reconstruction error. Good at catching subtle multi-variate deviations
- Combined: union of both detectors → high recall; intersection → high precision

Evaluation: Precision, Recall, F1, AUC-ROC (using injected anomaly labels)
"""

import os
import sys
import numpy as np
import pandas as pd
import joblib
from typing import Dict, Any, Tuple
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, classification_report,
)

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from config.settings import config

# Optional TensorFlow / Keras for Autoencoder
try:
    import tensorflow as tf
    from tensorflow import keras
    HAS_TF = True
except (ImportError, AttributeError, Exception):
    HAS_TF = False


FEATURE_COLS = [
    "temperature", "vibration", "power_consumption",
    "voltage", "current", "ambient_temperature", "humidity",
]


class AnomalyDetectionModel:
    """
    Dual-layer anomaly detector: Isolation Forest + Autoencoder.
    
    Training:   model.train(df_train, df_val)
    Inference:  result = model.predict(features_dict)
    """

    def __init__(self):
        self.iso_forest = None
        self.autoencoder = None
        self.scaler = StandardScaler()
        self.ae_threshold = None    # reconstruction error threshold
        self.iso_threshold = None   # isolation forest decision threshold
        self.metrics = {}
        self.feature_names = FEATURE_COLS

    def _get_features(self, df: pd.DataFrame) -> np.ndarray:
        """Extract and scale feature matrix."""
        cols = [c for c in self.feature_names if c in df.columns]
        return df[cols].fillna(0).values

    def train(self, df_train: pd.DataFrame, df_val: pd.DataFrame) -> Dict[str, Any]:
        """
        Train both Isolation Forest and Autoencoder.
        
        Args:
            df_train: Training data (feature-engineered)
            df_val: Validation data with 'is_anomaly' labels
        """
        print("\n🔍 Training Anomaly Detection Model")
        print("─" * 60)

        X_train_raw = self._get_features(df_train)
        X_val_raw = self._get_features(df_val)
        y_val = df_val["is_anomaly"].values if "is_anomaly" in df_val.columns else np.zeros(len(df_val))

        # Scale features
        X_train = self.scaler.fit_transform(X_train_raw)
        X_val = self.scaler.transform(X_val_raw)

        results = {}

        # ---- Isolation Forest ----
        print("  Training Isolation Forest...")
        self.iso_forest = IsolationForest(
            n_estimators=config.model.anomaly_n_estimators,
            contamination=config.model.anomaly_contamination,
            random_state=42,
            n_jobs=-1,
        )
        self.iso_forest.fit(X_train)
        iso_scores = -self.iso_forest.score_samples(X_val)  # higher = more anomalous
        iso_pred = (self.iso_forest.predict(X_val) == -1).astype(int)
        results["isolation_forest"] = self._evaluate(y_val, iso_pred, iso_scores, "Isolation Forest")

        # ---- Autoencoder ----
        if HAS_TF:
            print("  Training Autoencoder...")
            input_dim = X_train.shape[1]
            enc_dim = config.model.autoencoder_encoding_dim

            # Build autoencoder architecture
            encoder_input = keras.Input(shape=(input_dim,))
            x = keras.layers.Dense(32, activation="relu")(encoder_input)
            x = keras.layers.BatchNormalization()(x)
            x = keras.layers.Dense(16, activation="relu")(x)
            x = keras.layers.Dropout(0.2)(x)
            encoded = keras.layers.Dense(enc_dim, activation="relu", name="bottleneck")(x)
            x = keras.layers.Dense(16, activation="relu")(encoded)
            x = keras.layers.BatchNormalization()(x)
            x = keras.layers.Dense(32, activation="relu")(x)
            decoded = keras.layers.Dense(input_dim, activation="linear")(x)

            self.autoencoder = keras.Model(encoder_input, decoded)
            self.autoencoder.compile(optimizer="adam", loss="mse")

            # Train on NORMAL data only (unsupervised)
            if "is_anomaly" in df_train.columns:
                normal_mask = df_train["is_anomaly"] == 0
                X_train_normal = X_train[normal_mask.values[:len(X_train)]]
            else:
                X_train_normal = X_train

            self.autoencoder.fit(
                X_train_normal, X_train_normal,
                epochs=config.model.autoencoder_epochs,
                batch_size=config.model.autoencoder_batch_size,
                validation_split=0.1,
                verbose=0,
            )

            # Compute reconstruction error on validation
            X_val_reconstructed = self.autoencoder.predict(X_val, verbose=0)
            ae_errors = np.mean((X_val - X_val_reconstructed) ** 2, axis=1)

            # Set threshold at configured percentile of training reconstruction errors
            X_train_recon = self.autoencoder.predict(X_train_normal, verbose=0)
            train_errors = np.mean((X_train_normal - X_train_recon) ** 2, axis=1)
            self.ae_threshold = float(np.percentile(
                train_errors, config.model.autoencoder_threshold_percentile
            ))

            ae_pred = (ae_errors > self.ae_threshold).astype(int)
            results["autoencoder"] = self._evaluate(y_val, ae_pred, ae_errors, "Autoencoder")

            # ---- Combined (union for high recall) ----
            combined_pred = ((iso_pred == 1) | (ae_pred == 1)).astype(int)
            combined_scores = 0.5 * (iso_scores / (iso_scores.max() + 1e-9)) + \
                              0.5 * (ae_errors / (ae_errors.max() + 1e-9))
            results["combined"] = self._evaluate(y_val, combined_pred, combined_scores, "Combined")
        else:
            print("  ⚠ TensorFlow not available — using Isolation Forest only")

        self.metrics = results
        return results

    def predict(self, features: dict) -> Dict[str, Any]:
        """
        Detect anomaly for a single sensor reading.
        
        Returns:
            Dict with is_anomaly, anomaly_score, model used, individual scores
        """
        vals = [features.get(col, 0) for col in self.feature_names]
        X = self.scaler.transform([vals])

        scores = {}
        is_anomaly_votes = []

        # Isolation Forest
        if self.iso_forest:
            iso_score = float(-self.iso_forest.score_samples(X)[0])
            iso_pred = self.iso_forest.predict(X)[0] == -1
            scores["isolation_forest"] = iso_score
            is_anomaly_votes.append(iso_pred)

        # Autoencoder
        if self.autoencoder:
            recon = self.autoencoder.predict(X, verbose=0)
            ae_error = float(np.mean((X - recon) ** 2))
            ae_pred = ae_error > self.ae_threshold if self.ae_threshold else False
            scores["autoencoder"] = ae_error
            is_anomaly_votes.append(ae_pred)

        # Combine: anomaly if any detector flags it
        is_anomaly = any(is_anomaly_votes) if is_anomaly_votes else False

        # Normalized anomaly score (0 = normal, 1 = highly anomalous)
        if scores:
            max_iso = max(scores.get("isolation_forest", 0), 0.01)
            normalized = sum(scores.values()) / (len(scores) * max(max_iso, 1))
            anomaly_score = float(np.clip(normalized, 0, 1))
        else:
            anomaly_score = 0.0

        return {
            "is_anomaly": bool(is_anomaly),
            "anomaly_score": anomaly_score,
            "component_scores": scores,
            "model": "isolation_forest+autoencoder" if self.autoencoder else "isolation_forest",
        }

    def predict_batch(self, df: pd.DataFrame) -> pd.DataFrame:
        """Predict anomalies for a batch."""
        X_raw = self._get_features(df)
        X = self.scaler.transform(X_raw)

        result = pd.DataFrame(index=df.index)

        if self.iso_forest:
            result["iso_score"] = -self.iso_forest.score_samples(X)
            result["iso_anomaly"] = (self.iso_forest.predict(X) == -1).astype(int)

        if self.autoencoder:
            recon = self.autoencoder.predict(X, verbose=0)
            result["ae_error"] = np.mean((X - recon) ** 2, axis=1)
            result["ae_anomaly"] = (result["ae_error"] > self.ae_threshold).astype(int)

        return result

    def _evaluate(
        self, y_true: np.ndarray, y_pred: np.ndarray,
        scores: np.ndarray, name: str
    ) -> Dict[str, float]:
        """Compute classification metrics."""
        precision = precision_score(y_true, y_pred, zero_division=0)
        recall = recall_score(y_true, y_pred, zero_division=0)
        f1 = f1_score(y_true, y_pred, zero_division=0)

        try:
            auc = roc_auc_score(y_true, scores)
        except ValueError:
            auc = 0.0

        print(f"  {name}:  Precision={precision:.3f}  Recall={recall:.3f}  "
              f"F1={f1:.3f}  AUC={auc:.3f}")
        return {"precision": precision, "recall": recall, "f1": f1, "auc": auc}

    def save(self, model_dir: str = None):
        """Save all model artifacts."""
        model_dir = model_dir or config.model.model_dir
        os.makedirs(model_dir, exist_ok=True)

        joblib.dump(self.iso_forest, os.path.join(model_dir, "anomaly_isoforest.pkl"))
        joblib.dump(self.scaler, os.path.join(model_dir, "anomaly_scaler.pkl"))
        joblib.dump({
            "ae_threshold": self.ae_threshold,
            "feature_names": self.feature_names,
            "metrics": self.metrics,
        }, os.path.join(model_dir, "anomaly_meta.pkl"))

        if self.autoencoder:
            self.autoencoder.save(os.path.join(model_dir, "anomaly_autoencoder.keras"))

        print(f"  ✓ Anomaly models saved to {model_dir}")

    def load(self, model_dir: str = None):
        """Load persisted models."""
        model_dir = model_dir or config.model.model_dir

        iso_path = os.path.join(model_dir, "anomaly_isoforest.pkl")
        if os.path.exists(iso_path):
            self.iso_forest = joblib.load(iso_path)

        scaler_path = os.path.join(model_dir, "anomaly_scaler.pkl")
        if os.path.exists(scaler_path):
            self.scaler = joblib.load(scaler_path)

        meta_path = os.path.join(model_dir, "anomaly_meta.pkl")
        if os.path.exists(meta_path):
            meta = joblib.load(meta_path)
            self.ae_threshold = meta["ae_threshold"]
            self.feature_names = meta["feature_names"]
            self.metrics = meta["metrics"]

        ae_path = os.path.join(model_dir, "anomaly_autoencoder.keras")
        if os.path.exists(ae_path) and HAS_TF:
            self.autoencoder = keras.models.load_model(ae_path)

        print("  ✓ Anomaly models loaded")

"""
NEXOVA — Anomaly Detection Model
==================================
Two-layer anomaly detection combining Isolation Forest (fast, interpretable)
and an Autoencoder (captures complex non-linear patterns).

Model choice rationale:
- Isolation Forest: O(n log n), no assumptions on data distribution, works well
  on tabular IoT data with moderate dimensionality
- Autoencoder (PyTorch): learns a compressed representation; anomalies have high
  reconstruction error. GPU-accelerated via CUDA on RTX 4050.
- Combined: union of both detectors → high recall; intersection → high precision

Evaluation: Precision, Recall, F1, AUC-ROC (using injected anomaly labels)
"""

import os
import sys
import numpy as np
import pandas as pd
import joblib
from typing import Dict, Any, Tuple

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from config.settings import config

# PyTorch MUST be imported BEFORE sklearn to avoid DLL conflicts on Windows
try:
    import torch
    import torch.nn as nn
    from torch.utils.data import DataLoader, TensorDataset
    HAS_TORCH = True
    TORCH_DEVICE = config.gpu.torch_device
except (ImportError, OSError, Exception):
    HAS_TORCH = False
    TORCH_DEVICE = "cpu"
    # Placeholder so class definition doesn't fail at module load
    torch = None
    nn = None

from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, classification_report,
)


FEATURE_COLS = [
    "temperature", "vibration", "power_consumption",
    "voltage", "current", "ambient_temperature", "humidity",
]


# Autoencoder class defined only when PyTorch is available
if HAS_TORCH:
    class Autoencoder(nn.Module):
        """PyTorch Autoencoder for anomaly detection via reconstruction error."""

        def __init__(self, input_dim: int, encoding_dim: int = 8):
            super().__init__()
            self.encoder = nn.Sequential(
                nn.Linear(input_dim, 32),
                nn.ReLU(),
                nn.BatchNorm1d(32),
                nn.Linear(32, 16),
                nn.ReLU(),
                nn.Dropout(0.2),
                nn.Linear(16, encoding_dim),
                nn.ReLU(),
            )
            self.decoder = nn.Sequential(
                nn.Linear(encoding_dim, 16),
                nn.ReLU(),
                nn.BatchNorm1d(16),
                nn.Linear(16, 32),
                nn.ReLU(),
                nn.Linear(32, input_dim),
            )

        def forward(self, x):
            encoded = self.encoder(x)
            decoded = self.decoder(encoded)
            return decoded
else:
    Autoencoder = None  # Will be None when PyTorch is not available


class AnomalyDetectionModel:
    """
    Dual-layer anomaly detector: Isolation Forest + PyTorch Autoencoder (GPU).
    
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
        self.device = TORCH_DEVICE

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

        # ---- Isolation Forest (CPU — no GPU implementation in sklearn) ----
        print("  Training Isolation Forest (CPU)...")
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

        # ---- PyTorch Autoencoder (GPU-accelerated) ----
        if HAS_TORCH:
            device = self.device
            print(f"  Training Autoencoder on {device.upper()}...")
            input_dim = X_train.shape[1]
            enc_dim = config.model.autoencoder_encoding_dim

            # Build model and move to GPU
            self.autoencoder = Autoencoder(input_dim, enc_dim).to(device)
            optimizer = torch.optim.Adam(self.autoencoder.parameters(), lr=1e-3)
            criterion = nn.MSELoss()

            # Train on NORMAL data only (unsupervised)
            if "is_anomaly" in df_train.columns:
                normal_mask = df_train["is_anomaly"] == 0
                X_train_normal = X_train[normal_mask.values[:len(X_train)]]
            else:
                X_train_normal = X_train

            # Create PyTorch DataLoader
            train_tensor = torch.FloatTensor(X_train_normal).to(device)
            train_dataset = TensorDataset(train_tensor, train_tensor)
            train_loader = DataLoader(
                train_dataset,
                batch_size=config.model.autoencoder_batch_size,
                shuffle=True,
                drop_last=True,  # Avoid batch_size=1 which breaks BatchNorm1d
            )

            # Training loop
            self.autoencoder.train()
            epochs = config.model.autoencoder_epochs
            for epoch in range(epochs):
                epoch_loss = 0.0
                for batch_x, batch_y in train_loader:
                    optimizer.zero_grad()
                    output = self.autoencoder(batch_x)
                    loss = criterion(output, batch_y)
                    loss.backward()
                    optimizer.step()
                    epoch_loss += loss.item()
                if (epoch + 1) % 10 == 0:
                    avg_loss = epoch_loss / len(train_loader)
                    print(f"    Epoch {epoch+1}/{epochs} — Loss: {avg_loss:.6f}")

            # Compute reconstruction error on validation
            self.autoencoder.eval()
            with torch.no_grad():
                X_val_tensor = torch.FloatTensor(X_val).to(device)
                X_val_recon = self.autoencoder(X_val_tensor).cpu().numpy()
                ae_errors = np.mean((X_val - X_val_recon) ** 2, axis=1)

                # Set threshold at configured percentile of training reconstruction errors
                X_train_tensor = torch.FloatTensor(X_train_normal).to(device)
                X_train_recon = self.autoencoder(X_train_tensor).cpu().numpy()
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
            print("  ⚠ PyTorch not available — using Isolation Forest only")

        self.metrics = results
        return results

    def predict(self, features: dict) -> Dict[str, Any]:
        """
        Detect anomaly for a single sensor reading.
        
        Returns:
            Dict with is_anomaly, anomaly_score, model used, individual scores
        """
        # If no models loaded, use heuristic fallback
        if self.iso_forest is None and self.autoencoder is None:
            return self._fallback_predict(features)

        vals = [features.get(col, 0) for col in self.feature_names]
        try:
            X = self.scaler.transform([vals])
        except Exception:
            return self._fallback_predict(features)

        scores = {}
        is_anomaly_votes = []

        # Isolation Forest
        if self.iso_forest:
            iso_score = float(-self.iso_forest.score_samples(X)[0])
            iso_pred = self.iso_forest.predict(X)[0] == -1
            scores["isolation_forest"] = iso_score
            is_anomaly_votes.append(iso_pred)

        # PyTorch Autoencoder
        if self.autoencoder and HAS_TORCH:
            self.autoencoder.eval()
            with torch.no_grad():
                X_tensor = torch.FloatTensor(X).to(self.device)
                recon = self.autoencoder(X_tensor).cpu().numpy()
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

    def _fallback_predict(self, features: dict) -> Dict[str, Any]:
        """Heuristic-based anomaly detection when models aren't trained."""
        temp = features.get("temperature", 55)
        vib = features.get("vibration", 3)
        power = features.get("power_consumption", 50)

        score = 0.0
        if temp > 90:
            score += 0.35
        elif temp > 75:
            score += 0.15
        if vib > 8:
            score += 0.35
        elif vib > 5:
            score += 0.15
        if power > 200:
            score += 0.2
        elif power > 150:
            score += 0.1

        score = min(score, 1.0)
        return {
            "is_anomaly": score > 0.5,
            "anomaly_score": round(score, 3),
            "component_scores": {
                "temperature_heuristic": round(min(max(temp - 60, 0) / 40, 1), 3),
                "vibration_heuristic": round(min(max(vib - 4, 0) / 6, 1), 3),
                "power_heuristic": round(min(max(power - 100, 0) / 150, 1), 3),
            },
            "model": "heuristic_fallback",
        }

    def predict_batch(self, df: pd.DataFrame) -> pd.DataFrame:
        """Predict anomalies for a batch."""
        X_raw = self._get_features(df)
        X = self.scaler.transform(X_raw)

        result = pd.DataFrame(index=df.index)

        if self.iso_forest:
            result["iso_score"] = -self.iso_forest.score_samples(X)
            result["iso_anomaly"] = (self.iso_forest.predict(X) == -1).astype(int)

        if self.autoencoder and HAS_TORCH:
            self.autoencoder.eval()
            with torch.no_grad():
                X_tensor = torch.FloatTensor(X).to(self.device)
                recon = self.autoencoder(X_tensor).cpu().numpy()
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

        if self.autoencoder and HAS_TORCH:
            torch.save(self.autoencoder.state_dict(), os.path.join(model_dir, "anomaly_autoencoder.pt"))

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

        ae_path = os.path.join(model_dir, "anomaly_autoencoder.pt")
        if os.path.exists(ae_path) and HAS_TORCH:
            input_dim = len(self.feature_names)
            enc_dim = config.model.autoencoder_encoding_dim
            self.autoencoder = Autoencoder(input_dim, enc_dim).to(self.device)
            self.autoencoder.load_state_dict(torch.load(ae_path, map_location=self.device, weights_only=True))
            self.autoencoder.eval()

        print("  ✓ Anomaly models loaded")

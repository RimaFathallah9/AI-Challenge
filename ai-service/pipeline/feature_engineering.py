"""
NEXOVA — Feature Engineering Pipeline
======================================
Transforms raw (preprocessed) sensor data into rich feature vectors suitable
for all four core models. Uses rolling statistics, lag features, time encodings,
interaction features, and cross-machine deviations.

Designed for both batch training and real-time single-row inference.
"""

import numpy as np
import pandas as pd
from typing import List, Optional, Dict
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config.settings import config


class FeatureEngineer:
    """
    Transform preprocessed sensor data into ML-ready features.
    
    Feature families:
    1. Rolling statistics (mean, std, min, max) over 1h, 6h, 24h windows
    2. Lag values at t-1, t-6, t-12, t-24, t-72, t-288
    3. Rate-of-change (delta) features
    4. Cyclical time encodings (sin/cos for hour, day-of-week)
    5. Interaction features (power×temperature, vibration×runtime)
    6. Cross-machine fleet deviation
    """

    SENSOR_COLS = [
        "temperature", "vibration", "power_consumption",
        "voltage", "current", "ambient_temperature", "humidity",
    ]

    def __init__(self):
        self.fleet_means: Optional[Dict[str, float]] = None
        self.feature_names: List[str] = []

    def fit_transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """Compute fleet statistics from training data, then transform."""
        # Compute fleet baseline from training data
        self.fleet_means = {
            col: float(df[col].mean()) for col in self.SENSOR_COLS if col in df.columns
        }
        return self._transform(df)

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """Transform new data using previously fitted fleet means."""
        if self.fleet_means is None:
            raise RuntimeError("FeatureEngineer not fitted. Call fit_transform first.")
        return self._transform(df)

    def transform_single(self, row: dict) -> dict:
        """
        Transform a single sensor reading into features for real-time inference.
        Lag/rolling features are set to 0 (unavailable at single-point inference).
        """
        features = {}

        # Base sensor features
        for col in self.SENSOR_COLS:
            features[col] = row.get(col, 0)

        # Time features
        ts = pd.Timestamp(row.get("timestamp", pd.Timestamp.now()))
        hour = ts.hour + ts.minute / 60
        dow = ts.dayofweek
        features["hour_sin"] = np.sin(2 * np.pi * hour / 24)
        features["hour_cos"] = np.cos(2 * np.pi * hour / 24)
        features["dow_sin"] = np.sin(2 * np.pi * dow / 7)
        features["dow_cos"] = np.cos(2 * np.pi * dow / 7)
        features["is_weekend"] = 1 if dow >= 5 else 0

        # Interaction features
        features["power_x_temp"] = features.get("power_consumption", 0) * features.get("temperature", 0)
        features["vib_x_runtime"] = features.get("vibration", 0) * row.get("runtime_hours", 0)
        features["current_x_voltage"] = features.get("current", 0) * features.get("voltage", 0)

        # Fleet deviation
        if self.fleet_means:
            for col in self.SENSOR_COLS:
                if col in self.fleet_means and col in features:
                    features[f"{col}_fleet_dev"] = features[col] - self.fleet_means[col]

        # Runtime feature
        features["runtime_hours"] = row.get("runtime_hours", 0)

        # Lag/rolling placeholders (zero for single-point)
        for col in ["power_consumption", "temperature", "vibration"]:
            for w in config.features.rolling_windows:
                features[f"{col}_roll_mean_{w}"] = features.get(col, 0)
                features[f"{col}_roll_std_{w}"] = 0
            for lag in config.features.lag_steps:
                features[f"{col}_lag_{lag}"] = features.get(col, 0)
            features[f"{col}_delta_1h"] = 0

        return features

    def _transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """Internal: apply all feature transformations to a DataFrame."""
        df = df.copy()

        # ---- Time features ----
        if "timestamp" in df.columns:
            ts = pd.to_datetime(df["timestamp"])
            hour = ts.dt.hour + ts.dt.minute / 60
            dow = ts.dt.dayofweek
            df["hour_sin"] = np.sin(2 * np.pi * hour / 24)
            df["hour_cos"] = np.cos(2 * np.pi * hour / 24)
            df["dow_sin"] = np.sin(2 * np.pi * dow / 7)
            df["dow_cos"] = np.cos(2 * np.pi * dow / 7)
            df["is_weekend"] = (dow >= 5).astype(int)

        # ---- Rolling statistics (per machine) ----
        key_cols = ["power_consumption", "temperature", "vibration"]
        for col in key_cols:
            if col not in df.columns:
                continue
            for window in config.features.rolling_windows:
                if "machine_id" in df.columns:
                    grouped = df.groupby("machine_id")[col]
                    df[f"{col}_roll_mean_{window}"] = grouped.transform(
                        lambda x: x.rolling(window, min_periods=1).mean()
                    )
                    df[f"{col}_roll_std_{window}"] = grouped.transform(
                        lambda x: x.rolling(window, min_periods=1).std().fillna(0)
                    )
                else:
                    df[f"{col}_roll_mean_{window}"] = df[col].rolling(window, min_periods=1).mean()
                    df[f"{col}_roll_std_{window}"] = df[col].rolling(window, min_periods=1).std().fillna(0)

        # ---- Lag features ----
        for col in key_cols:
            if col not in df.columns:
                continue
            for lag in config.features.lag_steps:
                if "machine_id" in df.columns:
                    df[f"{col}_lag_{lag}"] = df.groupby("machine_id")[col].shift(lag)
                else:
                    df[f"{col}_lag_{lag}"] = df[col].shift(lag)

        # ---- Delta (rate of change over 1 hour = 12 steps at 5min) ----
        for col in key_cols:
            if col not in df.columns:
                continue
            if "machine_id" in df.columns:
                df[f"{col}_delta_1h"] = df.groupby("machine_id")[col].diff(12)
            else:
                df[f"{col}_delta_1h"] = df[col].diff(12)

        # ---- Interaction features ----
        if "power_consumption" in df.columns and "temperature" in df.columns:
            df["power_x_temp"] = df["power_consumption"] * df["temperature"]
        if "vibration" in df.columns and "runtime_hours" in df.columns:
            df["vib_x_runtime"] = df["vibration"] * df["runtime_hours"]
        if "current" in df.columns and "voltage" in df.columns:
            df["current_x_voltage"] = df["current"] * df["voltage"]

        # ---- Cross-machine fleet deviation ----
        if self.fleet_means:
            for col in self.SENSOR_COLS:
                if col in df.columns and col in self.fleet_means:
                    df[f"{col}_fleet_dev"] = df[col] - self.fleet_means[col]

        # ---- Fill NaN from lagging ----
        df.fillna(0, inplace=True)

        # Record feature names (excluding identifiers and targets)
        exclude = {"timestamp", "machine_id", "machine_type", "failure_label",
                    "maintenance_flag", "is_anomaly", "energy_efficiency"}
        self.feature_names = [c for c in df.columns if c not in exclude]

        return df

    def get_feature_names(self) -> List[str]:
        """Return ordered list of feature names produced by transform."""
        return self.feature_names

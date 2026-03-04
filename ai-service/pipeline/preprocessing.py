"""
NEXOVA — Data Preprocessing Pipeline
======================================
Cleans raw sensor data, handles missing values, removes physical impossibilities,
and standardizes features for downstream model consumption.
"""

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler, RobustScaler
from typing import Tuple, Optional
import joblib
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config.settings import config


class DataPreprocessor:
    """
    Industrial IoT data cleaning and normalization.
    
    Steps:
    1. Parse timestamps
    2. Handle missing values (forward fill then median impute)
    3. Clip to physical bounds
    4. Robust-scale continuous features  (handles outliers better than StandardScaler)
    """

    # Physical bounds for sensor columns (min, max)
    PHYSICAL_BOUNDS = {
        "temperature": (5, 250),
        "vibration": (0, 50),
        "power_consumption": (0, 600),
        "voltage": (100, 500),
        "current": (0, 400),
        "ambient_temperature": (-20, 60),
        "humidity": (0, 100),
    }

    def __init__(self):
        self.scaler: Optional[RobustScaler] = None
        self.feature_columns = config.features.sensor_columns
        self._median_cache = {}

    def fit_transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """Fit on training data and transform."""
        df = self._clean(df)
        self.scaler = RobustScaler()
        df[self.feature_columns] = self.scaler.fit_transform(df[self.feature_columns])
        # Cache medians for imputation at inference time
        self._median_cache = {col: float(df[col].median()) for col in self.feature_columns}
        return df

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """Transform new data using fitted scaler."""
        if self.scaler is None:
            raise RuntimeError("Preprocessor not fitted. Call fit_transform first.")
        df = self._clean(df)
        df[self.feature_columns] = self.scaler.transform(df[self.feature_columns])
        return df

    def _clean(self, df: pd.DataFrame) -> pd.DataFrame:
        """Core cleaning steps."""
        df = df.copy()

        # Ensure timestamp is datetime
        if "timestamp" in df.columns:
            df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")

        # Forward-fill then back-fill small gaps within each machine
        if "machine_id" in df.columns:
            df = df.groupby("machine_id", group_keys=False).apply(
                lambda g: g.ffill(limit=5).bfill(limit=5)
            )

        # Median impute remaining NaNs
        for col in self.feature_columns:
            if col in df.columns and df[col].isna().any():
                median = self._median_cache.get(col, df[col].median())
                df[col].fillna(median, inplace=True)

        # Clip to physical bounds
        for col, (lo, hi) in self.PHYSICAL_BOUNDS.items():
            if col in df.columns:
                df[col] = df[col].clip(lo, hi)

        return df

    def save(self, path: str):
        """Persist scaler and median cache."""
        os.makedirs(os.path.dirname(path), exist_ok=True)
        joblib.dump({"scaler": self.scaler, "medians": self._median_cache}, path)

    def load(self, path: str):
        """Load persisted scaler."""
        data = joblib.load(path)
        self.scaler = data["scaler"]
        self._median_cache = data["medians"]

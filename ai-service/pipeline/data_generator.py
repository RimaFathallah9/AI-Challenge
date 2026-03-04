"""
NEXOVA — Industrial IoT Synthetic Data Generator
=================================================
Generates 50,000+ rows of realistic time-series sensor data for multiple
industrial machines, including injected anomalies, failure patterns, and
energy inefficiency scenarios.

Design rationale:
- Each machine has a unique baseline profile (simulating different equipment types)
- Temporal patterns: diurnal (shift-based), weekly (weekday vs weekend), seasonal
- Anomalies are injected as gradual degradation, sudden spikes, and sensor drift
- Failure patterns precede the failure_label with a realistic degradation ramp
- Energy inefficiency is modeled as slow efficiency decay + sudden waste events
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, Tuple, Optional
import os
import sys

# Allow running from ai-service/ root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config.settings import config


# ============================================================================
# Machine Profile Templates — each machine type has different operating norms
# ============================================================================

MACHINE_PROFILES = {
    "CNC_MILL": {
        "temp_base": 55, "temp_std": 4, "vib_base": 3.5, "vib_std": 0.6,
        "power_base": 45, "power_std": 8, "voltage_base": 380, "current_base": 65,
    },
    "HYDRAULIC_PRESS": {
        "temp_base": 65, "temp_std": 5, "vib_base": 5.0, "vib_std": 0.9,
        "power_base": 75, "power_std": 12, "voltage_base": 415, "current_base": 110,
    },
    "CONVEYOR": {
        "temp_base": 40, "temp_std": 3, "vib_base": 2.0, "vib_std": 0.4,
        "power_base": 15, "power_std": 3, "voltage_base": 220, "current_base": 25,
    },
    "COMPRESSOR": {
        "temp_base": 70, "temp_std": 6, "vib_base": 4.5, "vib_std": 0.8,
        "power_base": 55, "power_std": 10, "voltage_base": 380, "current_base": 85,
    },
    "WELDING_ROBOT": {
        "temp_base": 80, "temp_std": 7, "vib_base": 2.5, "vib_std": 0.5,
        "power_base": 35, "power_std": 15, "voltage_base": 415, "current_base": 50,
    },
}


class NexovaDataGenerator:
    """
    Production-grade synthetic data generator for industrial IoT.
    
    Generates realistic multi-machine time-series with:
    - Diurnal and weekly seasonality
    - Correlated sensor readings (power ↔ temperature ↔ vibration)
    - Injected anomalies (spikes, drift, sensor freeze)
    - Failure degradation patterns (gradual ramp before failure)
    - Energy inefficiency windows
    """

    def __init__(self, seed: int = None):
        self.seed = seed or config.data.random_seed
        self.rng = np.random.default_rng(self.seed)
        self.cfg = config.data

    # ------------------------------------------------------------------
    # Core generation
    # ------------------------------------------------------------------

    def generate(self) -> pd.DataFrame:
        """
        Generate the full dataset: multiple machines × time steps.
        
        Returns:
            DataFrame with columns: timestamp, machine_id, machine_type,
            temperature, vibration, power_consumption, voltage, current,
            runtime_hours, ambient_temperature, humidity, maintenance_flag,
            failure_label, is_anomaly, energy_efficiency
        """
        print("\n" + "=" * 70)
        print("  NEXOVA Synthetic Data Generator")
        print("=" * 70)

        # Determine samples per machine so total ≥ target_rows_min
        samples_per_day = 24 * 60 // self.cfg.sample_interval_minutes  # 288 for 5-min
        total_samples = samples_per_day * self.cfg.num_days
        machines_needed = max(
            self.cfg.num_machines,
            int(np.ceil(self.cfg.target_rows_min / total_samples))
        )

        timestamps = pd.date_range(
            start="2024-01-01",
            periods=total_samples,
            freq=f"{self.cfg.sample_interval_minutes}min",
        )

        profile_names = list(MACHINE_PROFILES.keys())
        all_frames = []

        for i in range(machines_needed):
            machine_id = f"MACH_{i+1:04d}"
            machine_type = profile_names[i % len(profile_names)]
            profile = MACHINE_PROFILES[machine_type]

            print(f"  Generating {machine_id} ({machine_type}) — {total_samples} samples")
            df = self._generate_single_machine(
                timestamps, machine_id, machine_type, profile
            )
            all_frames.append(df)

        data = pd.concat(all_frames, ignore_index=True)
        data.sort_values(["timestamp", "machine_id"], inplace=True)
        data.reset_index(drop=True, inplace=True)

        print(f"\n  Total rows generated: {len(data):,}")
        print(f"  Machines: {data['machine_id'].nunique()}")
        print(f"  Date range: {data['timestamp'].min()} → {data['timestamp'].max()}")
        print(f"  Anomaly rate: {data['is_anomaly'].mean():.2%}")
        print(f"  Failure rate: {data['failure_label'].mean():.2%}")
        print("=" * 70 + "\n")

        return data

    def _generate_single_machine(
        self, timestamps: pd.DatetimeIndex, machine_id: str,
        machine_type: str, profile: dict
    ) -> pd.DataFrame:
        """Generate time-series for a single machine with all patterns."""
        n = len(timestamps)
        hours = np.asarray(timestamps.hour + timestamps.minute / 60, dtype=float)
        day_of_week = np.asarray(timestamps.dayofweek, dtype=float)
        day_of_year = np.asarray(timestamps.dayofyear, dtype=float)

        # ---- Temporal patterns ----
        # Shift pattern: machines run harder 6 AM – 10 PM
        shift_factor = 0.4 + 0.6 * np.clip(
            np.sin(np.pi * (hours - 6) / 16), 0, 1
        )
        # Weekend reduction
        weekend_factor = np.where(day_of_week >= 5, 0.6, 1.0)
        # Seasonal (summer = higher ambient temp → harder cooling)
        seasonal_factor = 1.0 + 0.15 * np.sin(2 * np.pi * (day_of_year - 80) / 365)

        load_factor = shift_factor * weekend_factor * seasonal_factor

        # ---- Base signals ----
        power = (
            profile["power_base"] * load_factor
            + self.rng.normal(0, profile["power_std"], n)
        )
        temperature = (
            profile["temp_base"]
            + 0.25 * (power - profile["power_base"])  # power-temp correlation
            + self.rng.normal(0, profile["temp_std"], n)
        )
        vibration = (
            profile["vib_base"]
            + 0.03 * (power - profile["power_base"])  # power-vib correlation
            + self.rng.normal(0, profile["vib_std"], n)
        )
        voltage = profile["voltage_base"] + self.rng.normal(0, 5, n)
        current = (
            profile["current_base"] * (power / profile["power_base"])
            + self.rng.normal(0, 3, n)
        )
        ambient_temperature = (
            22 + 8 * np.sin(2 * np.pi * (day_of_year - 80) / 365)  # seasonal
            + 3 * np.sin(2 * np.pi * hours / 24)  # diurnal
            + self.rng.normal(0, 1.5, n)
        )
        humidity = (
            55 + 15 * np.cos(2 * np.pi * (day_of_year - 170) / 365)
            + self.rng.normal(0, 5, n)
        )
        runtime_hours = np.cumsum(
            np.where(load_factor > 0.5, self.cfg.sample_interval_minutes / 60, 0)
        )

        # ---- Energy efficiency (1.0 = perfect, decays over time) ----
        efficiency = np.ones(n)
        # Slow degradation
        degradation = np.linspace(0, 0.12, n)  # up to 12% loss over dataset
        efficiency -= degradation
        # Random efficiency drops (simulating fouled filters, etc.)
        for _ in range(int(n * 0.002)):
            drop_start = self.rng.integers(0, n - 500)
            drop_len = self.rng.integers(100, 500)
            efficiency[drop_start:drop_start + drop_len] *= self.rng.uniform(0.8, 0.95)

        # ---- Inject Anomalies ----
        is_anomaly = np.zeros(n, dtype=bool)
        n_anomalies = int(n * self.cfg.anomaly_rate)
        anomaly_indices = self.rng.choice(n, size=n_anomalies, replace=False)

        for idx in anomaly_indices:
            atype = self.rng.choice(["spike", "dip", "overheat", "vibration_surge", "sensor_freeze"])
            if atype == "spike":
                power[idx] *= self.rng.uniform(1.8, 2.5)
            elif atype == "dip":
                power[idx] *= self.rng.uniform(0.1, 0.4)
            elif atype == "overheat":
                temperature[idx] += self.rng.uniform(15, 35)
            elif atype == "vibration_surge":
                vibration[idx] *= self.rng.uniform(2.0, 4.0)
            elif atype == "sensor_freeze":
                # Freeze to previous value for a window
                window = min(20, n - idx)
                power[idx:idx + window] = power[max(0, idx - 1)]
                temperature[idx:idx + window] = temperature[max(0, idx - 1)]
            is_anomaly[idx] = True

        # ---- Inject Failure Patterns ----
        failure_label = np.zeros(n, dtype=int)
        maintenance_flag = np.zeros(n, dtype=int)
        n_failures = max(3, int(n * self.cfg.failure_rate / 100))  # at least 3 failure events

        failure_points = sorted(self.rng.choice(
            range(500, n - 50), size=n_failures, replace=False
        ))

        for fp in failure_points:
            # Gradual ramp: 24-72 hours before failure (288-864 steps at 5-min)
            ramp_len = self.rng.integers(288, min(864, fp))
            ramp_start = fp - ramp_len

            # Temperature creep
            ramp = np.linspace(0, self.rng.uniform(15, 30), ramp_len)
            temperature[ramp_start:fp] += ramp
            # Vibration creep
            vib_ramp = np.linspace(0, self.rng.uniform(2, 6), ramp_len)
            vibration[ramp_start:fp] += vib_ramp
            # Power instability
            power[ramp_start:fp] += self.rng.normal(0, profile["power_std"] * 2, ramp_len)

            # Mark failure window (last 2 hours before failure point)
            fail_window = min(24, fp - ramp_start)
            failure_label[fp - fail_window:fp + 1] = 1

            # Maintenance flag: set after failure for recovery period
            recovery = min(48, n - fp - 1)
            maintenance_flag[fp:fp + recovery] = 1

        # ---- Inject Energy Inefficiency Patterns ----
        # Machines running at low utilization but high power (waste)
        n_waste_events = self.rng.integers(5, 15)
        for _ in range(n_waste_events):
            waste_start = self.rng.integers(0, n - 200)
            waste_len = self.rng.integers(50, 200)
            end = min(waste_start + waste_len, n)
            power[waste_start:end] *= self.rng.uniform(1.3, 1.6)
            efficiency[waste_start:end] *= self.rng.uniform(0.6, 0.8)

        # ---- Clip to physical bounds ----
        power = np.clip(power, 0.5, 500)
        temperature = np.clip(temperature, 10, 200)
        vibration = np.clip(vibration, 0, 30)
        voltage = np.clip(voltage, 180, 480)
        current = np.clip(current, 0.5, 300)
        ambient_temperature = np.clip(ambient_temperature, -10, 50)
        humidity = np.clip(humidity, 10, 100)
        efficiency = np.clip(efficiency, 0.3, 1.0)

        return pd.DataFrame({
            "timestamp": timestamps,
            "machine_id": machine_id,
            "machine_type": machine_type,
            "temperature": np.round(temperature, 2),
            "vibration": np.round(vibration, 3),
            "power_consumption": np.round(power, 2),
            "voltage": np.round(voltage, 1),
            "current": np.round(current, 2),
            "runtime_hours": np.round(runtime_hours, 2),
            "ambient_temperature": np.round(ambient_temperature, 2),
            "humidity": np.round(humidity, 1),
            "maintenance_flag": maintenance_flag,
            "failure_label": failure_label,
            "is_anomaly": is_anomaly.astype(int),
            "energy_efficiency": np.round(efficiency, 4),
        })

    # ------------------------------------------------------------------
    # Dataset splitting and saving
    # ------------------------------------------------------------------

    def generate_and_save(self) -> Dict[str, str]:
        """
        Generate full dataset, split into train/val/test, and persist.
        
        Returns:
            Dict mapping split name → file path.
        """
        os.makedirs(self.cfg.output_dir, exist_ok=True)
        df = self.generate()

        # Time-based split (respects temporal ordering)
        n = len(df)
        train_end = int(n * self.cfg.train_ratio)
        val_end = int(n * (self.cfg.train_ratio + self.cfg.val_ratio))

        splits = {
            "train": df.iloc[:train_end],
            "val": df.iloc[train_end:val_end],
            "test": df.iloc[val_end:],
            "full": df,
        }

        paths = {}
        for name, split_df in splits.items():
            path = os.path.join(self.cfg.output_dir, f"{name}_data.csv")
            split_df.to_csv(path, index=False)
            paths[name] = path
            print(f"  ✓ Saved {name}: {len(split_df):,} rows → {path}")

        # Save dataset statistics for monitoring / drift detection
        stats = {
            "total_rows": int(n),
            "machines": int(df["machine_id"].nunique()),
            "date_range": [str(df["timestamp"].min()), str(df["timestamp"].max())],
            "anomaly_rate": float(df["is_anomaly"].mean()),
            "failure_rate": float(df["failure_label"].mean()),
            "column_stats": {},
        }
        for col in ["temperature", "vibration", "power_consumption", "voltage", "current"]:
            stats["column_stats"][col] = {
                "mean": float(df[col].mean()),
                "std": float(df[col].std()),
                "min": float(df[col].min()),
                "max": float(df[col].max()),
                "median": float(df[col].median()),
            }

        import json
        stats_path = os.path.join(self.cfg.output_dir, "dataset_stats.json")
        with open(stats_path, "w") as f:
            json.dump(stats, f, indent=2, default=str)
        paths["stats"] = stats_path
        print(f"  ✓ Saved statistics → {stats_path}")

        return paths


# ============================================================================
# CLI entry point
# ============================================================================

if __name__ == "__main__":
    generator = NexovaDataGenerator()
    paths = generator.generate_and_save()
    print("\n✅ Data generation complete!")
    for name, path in paths.items():
        print(f"   {name}: {path}")

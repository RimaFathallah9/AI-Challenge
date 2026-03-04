"""
NEXOVA AI Service — Centralized Configuration
All tunable parameters in one place for production flexibility.
"""

import os
from dataclasses import dataclass, field
from typing import List


@dataclass
class GPUConfig:
    """GPU / CUDA acceleration settings."""
    use_gpu: bool = True  # Set False to force CPU
    # Auto-detected at runtime — override only if needed
    device: str = ""  # "cuda", "cpu", or "" for auto-detect

    def resolve_device(self) -> str:
        """Resolve the actual device string at runtime."""
        if self.device:
            return self.device
        if not self.use_gpu:
            return "cpu"
        # Auto-detect CUDA availability
        try:
            import torch
            return "cuda" if torch.cuda.is_available() else "cpu"
        except (ImportError, OSError, Exception):
            return "cpu"

    @property
    def xgboost_device(self) -> str:
        """XGBoost device string: 'cuda' or 'cpu'."""
        dev = self.resolve_device()
        return "cuda" if dev == "cuda" else "cpu"

    @property
    def xgboost_tree_method(self) -> str:
        """XGBoost tree_method: 'hist' works for both CPU and GPU."""
        return "hist"

    @property
    def lightgbm_device(self) -> str:
        """LightGBM device string: 'gpu' or 'cpu'."""
        dev = self.resolve_device()
        return "gpu" if dev == "cuda" else "cpu"

    @property
    def torch_device(self) -> str:
        """PyTorch device string."""
        return self.resolve_device()


@dataclass
class DataConfig:
    """Synthetic data generation parameters."""
    num_machines: int = 20
    num_days: int = 180
    sample_interval_minutes: int = 5
    target_rows_min: int = 50_000
    train_ratio: float = 0.7
    val_ratio: float = 0.15
    test_ratio: float = 0.15
    anomaly_rate: float = 0.05
    failure_rate: float = 0.03
    random_seed: int = 42
    output_dir: str = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")


@dataclass
class ModelConfig:
    """Model training hyperparameters."""
    model_dir: str = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models", "trained")

    # Energy prediction (XGBoost)
    energy_n_estimators: int = 500
    energy_max_depth: int = 8
    energy_learning_rate: float = 0.05
    energy_subsample: float = 0.8
    energy_colsample_bytree: float = 0.8

    # Anomaly detection (Isolation Forest)
    anomaly_contamination: float = 0.05
    anomaly_n_estimators: int = 200
    # Anomaly detection (Autoencoder)
    autoencoder_encoding_dim: int = 8
    autoencoder_epochs: int = 50
    autoencoder_batch_size: int = 256
    autoencoder_threshold_percentile: float = 95.0

    # Predictive maintenance (XGBoost Classifier)
    maintenance_n_estimators: int = 400
    maintenance_max_depth: int = 6
    maintenance_learning_rate: float = 0.05
    maintenance_scale_pos_weight: float = 10.0  # handle class imbalance

    # Optimization (Q-Learning)
    rl_episodes: int = 5000
    rl_alpha: float = 0.1       # learning rate
    rl_gamma: float = 0.95      # discount factor
    rl_epsilon_start: float = 1.0
    rl_epsilon_end: float = 0.01
    rl_epsilon_decay: float = 0.995


@dataclass
class FeatureConfig:
    """Feature engineering parameters."""
    rolling_windows: List[int] = field(default_factory=lambda: [12, 72, 288])  # 1h, 6h, 24h at 5min intervals
    lag_steps: List[int] = field(default_factory=lambda: [1, 6, 12, 24, 72, 288])
    sensor_columns: List[str] = field(default_factory=lambda: [
        "temperature", "vibration", "power_consumption",
        "voltage", "current", "ambient_temperature", "humidity"
    ])


@dataclass
class APIConfig:
    """API serving configuration."""
    host: str = "0.0.0.0"
    port: int = 8000
    workers: int = 4
    reload: bool = False
    log_level: str = "info"
    cors_origins: List[str] = field(default_factory=lambda: ["*"])


@dataclass
class NexovaConfig:
    """Root configuration container."""
    gpu: GPUConfig = field(default_factory=GPUConfig)
    data: DataConfig = field(default_factory=DataConfig)
    model: ModelConfig = field(default_factory=ModelConfig)
    features: FeatureConfig = field(default_factory=FeatureConfig)
    api: APIConfig = field(default_factory=APIConfig)


# Singleton configuration instance
config = NexovaConfig()

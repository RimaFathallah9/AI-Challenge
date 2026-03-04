"""
NEXOVA — Full Training Pipeline Orchestrator
=============================================
Runs all steps in sequence:
1. Generate synthetic data (if not present)
2. Preprocess
3. Feature-engineer
4. Train all 4 models
5. Save all artifacts
6. Report metrics

Usage:
    python -m pipeline.training.train_all
"""

import os
import sys
import json
import time
from datetime import datetime

# PyTorch must be imported BEFORE sklearn-based modules to avoid DLL conflicts on Windows
try:
    import torch
except (ImportError, OSError):
    pass

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from config.settings import config
from pipeline.data_generator import NexovaDataGenerator
from pipeline.preprocessing import DataPreprocessor
from pipeline.feature_engineering import FeatureEngineer
from pipeline.training.energy_model import EnergyPredictionModel
from pipeline.training.anomaly_model import AnomalyDetectionModel
from pipeline.training.maintenance_model import PredictiveMaintenanceModel
from pipeline.training.optimization_model import OptimizationModel

import pandas as pd


def run_full_pipeline():
    """Execute the complete training pipeline."""
    start = time.time()
    model_dir = config.model.model_dir
    data_dir = config.data.output_dir
    os.makedirs(model_dir, exist_ok=True)

    print("\n" + "=" * 70)
    print("  NEXOVA ML TRAINING PIPELINE")
    print("  " + datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    print("=" * 70)

    # ------------------------------------------------------------------
    # Step 1: Data Generation
    # ------------------------------------------------------------------
    train_path = os.path.join(data_dir, "train_data.csv")
    if not os.path.exists(train_path):
        print("\n📊 Step 1/5: Generating synthetic data...")
        generator = NexovaDataGenerator()
        generator.generate_and_save()
    else:
        print(f"\n📊 Step 1/5: Using existing data in {data_dir}")

    # Load splits
    print("  Loading datasets...")
    df_train = pd.read_csv(os.path.join(data_dir, "train_data.csv"))
    df_val = pd.read_csv(os.path.join(data_dir, "val_data.csv"))
    df_test = pd.read_csv(os.path.join(data_dir, "test_data.csv"))
    print(f"  Train: {len(df_train):,}  Val: {len(df_val):,}  Test: {len(df_test):,}")

    # ------------------------------------------------------------------
    # Step 2: Preprocessing
    # ------------------------------------------------------------------
    print("\n🔧 Step 2/5: Preprocessing...")
    preprocessor = DataPreprocessor()
    df_train = preprocessor.fit_transform(df_train)
    df_val = preprocessor.transform(df_val)
    df_test = preprocessor.transform(df_test)
    preprocessor.save(os.path.join(model_dir, "preprocessor.pkl"))
    print("  ✓ Preprocessing complete")

    # ------------------------------------------------------------------
    # Step 3: Feature Engineering
    # ------------------------------------------------------------------
    print("\n⚙️  Step 3/5: Feature engineering...")
    fe = FeatureEngineer()
    df_train = fe.fit_transform(df_train)
    df_val = fe.transform(df_val)
    df_test = fe.transform(df_test)
    print(f"  ✓ {len(fe.get_feature_names())} features generated")

    # Save feature engineer state (fleet means, feature names)
    import joblib
    joblib.dump({
        "fleet_means": fe.fleet_means,
        "feature_names": fe.feature_names,
    }, os.path.join(model_dir, "feature_engineer.pkl"))

    # ------------------------------------------------------------------
    # Step 4: Train all models
    # ------------------------------------------------------------------
    print("\n🤖 Step 4/5: Training models...")

    all_metrics = {}

    # 4a: Energy prediction
    energy_model = EnergyPredictionModel()
    all_metrics["energy"] = energy_model.train(df_train, df_val)
    energy_model.save(model_dir)

    # 4b: Anomaly detection
    anomaly_model = AnomalyDetectionModel()
    all_metrics["anomaly"] = anomaly_model.train(df_train, df_val)
    anomaly_model.save(model_dir)

    # 4c: Predictive maintenance
    maintenance_model = PredictiveMaintenanceModel()
    all_metrics["maintenance"] = maintenance_model.train(df_train, df_val)
    maintenance_model.save(model_dir)

    # 4d: Optimization
    optimization_model = OptimizationModel()
    all_metrics["optimization"] = optimization_model.train(df_train)
    optimization_model.save(model_dir)

    # ------------------------------------------------------------------
    # Step 5: Save master metrics
    # ------------------------------------------------------------------
    duration = time.time() - start
    master_metrics = {
        "pipeline_version": "3.0.0",
        "trained_at": datetime.now().isoformat(),
        "duration_seconds": round(duration, 1),
        "data": {
            "train_rows": len(df_train),
            "val_rows": len(df_val),
            "test_rows": len(df_test),
            "n_features": len(fe.get_feature_names()),
        },
        "models": all_metrics,
    }

    metrics_path = os.path.join(model_dir, "training_metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(master_metrics, f, indent=2, default=str)

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------
    print("\n" + "=" * 70)
    print("  ✅ TRAINING PIPELINE COMPLETE")
    print(f"  Duration: {duration:.1f}s")
    print(f"  Models saved to: {model_dir}")
    print(f"  Metrics saved to: {metrics_path}")
    print("=" * 70)

    # Print compact metrics summary
    print("\n📊 Model Performance Summary:")
    print("─" * 50)
    if "energy" in all_metrics:
        best = all_metrics["energy"].get("ensemble", all_metrics["energy"].get("xgboost", {}))
        print(f"  Energy:      R²={best.get('r2', 'N/A'):.4f}  RMSE={best.get('rmse', 'N/A'):.3f}")
    if "anomaly" in all_metrics:
        am = all_metrics["anomaly"]
        best = am.get("combined", am.get("isolation_forest", {}))
        print(f"  Anomaly:     F1={best.get('f1', 'N/A'):.3f}  AUC={best.get('auc', 'N/A'):.3f}")
    if "maintenance" in all_metrics:
        mm = all_metrics["maintenance"]
        print(f"  Maintenance: F1={mm.get('f1', 'N/A'):.4f}  AUC={mm.get('auc_roc', 'N/A'):.4f}")
    if "optimization" in all_metrics:
        om = all_metrics["optimization"]
        print(f"  Optimization: States={om.get('q_table_states', '?')}  "
              f"Reward Δ={om.get('reward_improvement', 0):+.3f}")
    print("─" * 50 + "\n")

    return master_metrics


if __name__ == "__main__":
    run_full_pipeline()

"""
Fake data generator for training ML models.
Generates realistic industrial energy data, anomalies, and sensor readings.
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import json
from typing import Dict, List, Tuple
import os

class IndustrialDataGenerator:
    """Generate realistic industrial IoT sensor data."""
    
    def __init__(self, seed: int = 42):
        np.random.seed(seed)
        self.seed = seed
    
    def generate_energy_timeseries(
        self,
        days: int = 90,
        frequency: str = '5min',
        machines: int = 5,
        include_anomalies: bool = True
    ) -> pd.DataFrame:
        """
        Generate energy consumption timeseries data.
        
        Args:
            days: Number of days to generate
            frequency: Pandas frequency string
            machines: Number of machines
            include_anomalies: Whether to inject anomalies
            
        Returns:
            DataFrame with columns: timestamp, machine_id, power, temperature, 
                                   vibration, runtime, production, is_anomaly
        """
        dates = pd.date_range(
            start='2024-01-01',
            periods=int(24*60/5) * days,  # 5-min intervals
            freq=frequency
        )
        
        records = []
        
        for machine_id in range(1, machines + 1):
            # Base seasonal energy pattern
            hour_of_day = dates.hour / 24
            day_of_week = dates.dayofweek / 7
            
            # Seasonal component (higher during working hours)
            seasonal = 50 + 30 * np.sin(2 * np.pi * hour_of_day) + \
                      20 * np.cos(2 * np.pi * day_of_week)
            
            # Random walk for trend
            trend = np.cumsum(np.random.normal(0, 0.1, len(dates)))
            
            # Base power consumption
            power = 100 + seasonal + trend + np.random.normal(0, 5, len(dates))
            power = np.clip(power, 20, 300)
            
            # Correlated metrics
            temperature = 40 + 0.3 * power + np.random.normal(0, 2, len(dates))
            vibration = 2 + 0.02 * power + np.random.normal(0, 0.5, len(dates))
            runtime = np.where(power > 50, 1, 0) * np.random.uniform(0.5, 1, len(dates))
            production = np.clip(runtime * power / 100, 0, 5)
            
            # Inject anomalies
            is_anomaly = np.zeros(len(dates), dtype=bool)
            if include_anomalies:
                # Power spikes
                anomaly_indices = np.random.choice(len(dates), size=int(0.05 * len(dates)), replace=False)
                for idx in anomaly_indices:
                    anomaly_type = np.random.choice(['spike', 'dip', 'overheat'])
                    if anomaly_type == 'spike':
                        power[idx] *= np.random.uniform(1.5, 2.0)
                    elif anomaly_type == 'dip':
                        power[idx] *= np.random.uniform(0.3, 0.7)
                    else:  # overheat
                        temperature[idx] *= np.random.uniform(1.3, 1.6)
                    is_anomaly[idx] = True
            
            df_machine = pd.DataFrame({
                'timestamp': dates,
                'machine_id': f'MACHINE_{machine_id:03d}',
                'power': power,
                'temperature': temperature,
                'vibration': vibration,
                'runtime': runtime,
                'production': production,
                'is_anomaly': is_anomaly
            })
            records.append(df_machine)
        
        return pd.concat(records, ignore_index=True)
    
    def generate_ml_training_data(
        self,
        output_dir: str = './data',
        train_split: float = 0.8,
        test_split: float = 0.1
    ) -> Dict[str, str]:
        """
        Generate complete training, validation, and test datasets.
        
        Returns:
            Dict with paths to generated files
        """
        os.makedirs(output_dir, exist_ok=True)
        
        # Generate 180 days of data
        df = self.generate_energy_timeseries(days=180, machines=8)
        
        # Split data
        n = len(df)
        train_end = int(n * train_split)
        val_end = int(n * (train_split + test_split))
        
        df_train = df.iloc[:train_end]
        df_val = df.iloc[train_end:val_end]
        df_test = df.iloc[val_end:]
        
        # Save datasets
        paths = {}
        for split, data in [
            ('train', df_train),
            ('val', df_val),
            ('test', df_test),
            ('full', df)
        ]:
            path = os.path.join(output_dir, f'{split}_data.csv')
            data.to_csv(path, index=False)
            paths[split] = path
            print(f"✓ Generated {split}: {len(data)} records -> {path}")
        
        # Generate anomaly-only dataset for anomaly detection training
        df_anomalies = df[df['is_anomaly'] == True]
        df_normal = df[df['is_anomaly'] == False].sample(n=len(df_anomalies))
        df_binary = pd.concat([df_anomalies, df_normal])
        
        path = os.path.join(output_dir, 'anomaly_binary.csv')
        df_binary.to_csv(path, index=False)
        paths['anomalies'] = path
        print(f"✓ Generated anomaly dataset: {len(df_binary)} records -> {path}")
        
        return paths
    
    def generate_forecast_baseline(
        self,
        output_file: str = './data/forecast_baseline.json'
    ) -> Dict:
        """Generate baseline metrics for forecast evaluation."""
        df = self.generate_energy_timeseries(days=30, machines=3)
        
        baseline = {
            'generated_at': datetime.now().isoformat(),
            'statistics': {
                'mean_power': float(df['power'].mean()),
                'std_power': float(df['power'].std()),
                'min_power': float(df['power'].min()),
                'max_power': float(df['power'].max()),
                'mean_temp': float(df['temperature'].mean()),
                'mean_vibration': float(df['vibration'].mean()),
                'anomaly_rate': float(df['is_anomaly'].mean()),
            },
            'machines': df['machine_id'].unique().tolist(),
        }
        
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        with open(output_file, 'w') as f:
            json.dump(baseline, f, indent=2)
        
        return baseline


def main():
    """Generate all training data."""
    print("\n🔧 Industrial Data Generator\n")
    print("=" * 50)
    
    gen = IndustrialDataGenerator(seed=42)
    
    # Generate datasets
    print("\n📊 Generating training datasets...")
    paths = gen.generate_ml_training_data(output_dir='./data')
    
    print("\n📈 Generating forecast baseline...")
    baseline = gen.generate_forecast_baseline()
    
    print("\n" + "=" * 50)
    print("✅ Data generation complete!")
    print(f"\nGenerated files:")
    for key, path in paths.items():
        print(f"  • {key}: {path}")
    print(f"  • baseline: ./data/forecast_baseline.json")
    print("\n" + "=" * 50)


if __name__ == '__main__':
    main()

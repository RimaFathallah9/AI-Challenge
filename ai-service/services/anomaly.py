import numpy as np
from typing import List
from models.schemas import SensorReading


def detect_anomalies(data: List[SensorReading]) -> dict:
    """
    Isolation Forest anomaly detection on sensor readings.
    Returns list of anomalous readings with scores.
    """
    if len(data) < 5:
        return {"anomalies": [], "anomaly_count": 0, "anomaly_rate": 0.0}

    features = np.array([[r.power, r.voltage, r.current, r.temperature] for r in data])

    try:
        from sklearn.ensemble import IsolationForest

        clf = IsolationForest(
            n_estimators=100,
            contamination=0.05,  # expect ~5% anomalies
            random_state=42,
        )
        labels = clf.fit_predict(features)
        scores = clf.decision_function(features)

        anomalies = []
        for i, (label, score, reading) in enumerate(zip(labels, scores, data)):
            if label == -1:
                anomalies.append(
                    {
                        "index": i,
                        "anomaly_score": float(-score),  # higher = more anomalous
                        "power": reading.power,
                        "voltage": reading.voltage,
                        "current": reading.current,
                        "temperature": reading.temperature,
                        "timestamp": (
                            reading.timestamp.isoformat() if reading.timestamp else None
                        ),
                    }
                )

        anomaly_count = len(anomalies)
        anomaly_rate = anomaly_count / len(data)

        return {
            "anomalies": anomalies,
            "anomaly_count": anomaly_count,
            "anomaly_rate": float(anomaly_rate),
        }

    except ImportError:
        # Fallback: Z-score based detection
        mean_power = np.mean([r.power for r in data])
        std_power = np.std([r.power for r in data]) + 1e-9
        anomalies = []
        for i, r in enumerate(data):
            z = abs((r.power - mean_power) / std_power)
            if z > 2.5:
                anomalies.append(
                    {
                        "index": i,
                        "anomaly_score": float(z),
                        "power": r.power,
                        "voltage": r.voltage,
                        "current": r.current,
                        "temperature": r.temperature,
                        "timestamp": r.timestamp.isoformat() if r.timestamp else None,
                    }
                )

        return {
            "anomalies": anomalies,
            "anomaly_count": len(anomalies),
            "anomaly_rate": float(len(anomalies) / len(data)),
        }

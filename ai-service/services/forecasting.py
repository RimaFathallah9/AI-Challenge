import pandas as pd
import numpy as np
from typing import List
from models.schemas import TimeSeriesPoint


def forecast_energy(data: List[TimeSeriesPoint], horizon: int = 24) -> dict:
    """
    Prophet-based energy forecasting.
    Falls back to linear trend if Prophet not available or data insufficient.
    """
    if len(data) < 10:
        # Not enough data — return simple estimate
        avg = np.mean([p.y for p in data]) if data else 50.0
        return {
            "predicted_total": float(avg * horizon),
            "confidence": 0.5,
            "forecast": [
                {
                    "ds": str(i),
                    "yhat": avg,
                    "yhat_lower": avg * 0.85,
                    "yhat_upper": avg * 1.15,
                }
                for i in range(horizon)
            ],
        }

    try:
        from prophet import Prophet

        df = pd.DataFrame([{"ds": p.ds, "y": p.y} for p in data])
        df["ds"] = pd.to_datetime(df["ds"])
        df = df.sort_values("ds").reset_index(drop=True)

        model = Prophet(
            yearly_seasonality=False,
            weekly_seasonality=True,
            daily_seasonality=True,
            interval_width=0.95,
        )
        model.fit(df)

        future = model.make_future_dataframe(periods=horizon, freq="H")
        forecast = model.predict(future)

        forecast_slice = forecast.tail(horizon)
        predicted_total = float(forecast_slice["yhat"].sum())
        # Confidence: 1 - avg relative uncertainty
        relative_unc = (
            (forecast_slice["yhat_upper"] - forecast_slice["yhat_lower"])
            / (forecast_slice["yhat"].abs() + 1e-9)
        ).mean()
        confidence = float(max(0, min(1, 1 - relative_unc / 2)))

        return {
            "predicted_total": predicted_total,
            "confidence": confidence,
            "forecast": forecast_slice[["ds", "yhat", "yhat_lower", "yhat_upper"]]
            .rename(
                columns={
                    "ds": "ds",
                    "yhat": "yhat",
                    "yhat_lower": "yhat_lower",
                    "yhat_upper": "yhat_upper",
                }
            )
            .to_dict(orient="records"),
        }

    except ImportError:
        # Prophet not installed — linear extrapolation fallback
        values = [p.y for p in data]
        trend = (values[-1] - values[0]) / len(values)
        predicted = [values[-1] + trend * (i + 1) for i in range(horizon)]
        avg = np.mean(predicted)
        return {
            "predicted_total": float(sum(predicted)),
            "confidence": 0.65,
            "forecast": [
                {
                    "ds": str(i),
                    "yhat": float(v),
                    "yhat_lower": float(v * 0.85),
                    "yhat_upper": float(v * 1.15),
                }
                for i, v in enumerate(predicted)
            ],
        }

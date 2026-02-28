import numpy as np
from typing import List, Dict, Any


def generate_recommendations(
    machine_id: str, readings: List[Dict[str, Any]], alerts: List[Dict[str, Any]]
) -> dict:
    """
    Rule-based + statistical recommendation engine.
    Generates optimization suggestions based on readings and active alerts.
    """
    recommendations = []
    efficiency_score = 100.0

    if not readings:
        return {"recommendations": [], "efficiency_score": 0.0}

    powers = [r.get("power", 0) for r in readings]
    temps = [r.get("temperature", 0) for r in readings]

    avg_power = np.mean(powers)
    max_power = np.max(powers)
    avg_temp = np.mean(temps)
    power_variance = np.var(powers)

    # Rule 1: High average power
    if avg_power > 30:
        efficiency_score -= 15
        recommendations.append(
            {
                "content": f"Average power consumption is high ({avg_power:.1f} kW). Consider scheduling heavy operations during off-peak hours (10 PM - 6 AM) to reduce demand charges.",
                "savings": float(
                    avg_power * 0.1 * 24 * 0.12
                ),  # estimated kWh × unit cost
                "priority": "HIGH",
            }
        )

    # Rule 2: High temperature
    if avg_temp > 75:
        efficiency_score -= 10
        recommendations.append(
            {
                "content": f"Machine temperature averaging {avg_temp:.1f}°C. Check cooling systems and ensure adequate ventilation. High temperatures reduce equipment lifespan by up to 30%.",
                "savings": None,
                "priority": "HIGH",
            }
        )

    # Rule 3: High variance (unstable load)
    if power_variance > 50:
        efficiency_score -= 8
        recommendations.append(
            {
                "content": "Unstable power consumption detected. Investigate load balancing — consider adding a power factor correction unit to smooth consumption spikes.",
                "savings": float(power_variance * 0.005),
                "priority": "MEDIUM",
            }
        )

    # Rule 4: Peak to average ratio
    if max_power > avg_power * 1.5:
        efficiency_score -= 7
        recommendations.append(
            {
                "content": f"Peak-to-average power ratio is {max_power / avg_power:.1f}x. Consider soft-start mechanisms or staggering machine startups to reduce peak demand.",
                "savings": float((max_power - avg_power) * 0.2 * 0.12),
                "priority": "MEDIUM",
            }
        )

    # Rule 5: Active alerts
    critical_alerts = [a for a in alerts if a.get("severity") in ["CRITICAL", "HIGH"]]
    if critical_alerts:
        efficiency_score -= 20
        recommendations.append(
            {
                "content": f"There are {len(critical_alerts)} active critical/high alerts. Immediate maintenance inspection recommended to prevent further efficiency loss.",
                "savings": None,
                "priority": "CRITICAL",
            }
        )

    # Rule 6: General optimization if no issues
    if not recommendations:
        recommendations.append(
            {
                "content": "Machine is operating within optimal parameters. Consider predictive maintenance scheduling in the next 30 days to maintain efficiency.",
                "savings": float(avg_power * 0.05 * 720 * 0.12),
                "priority": "LOW",
            }
        )

    efficiency_score = max(0.0, min(100.0, efficiency_score))

    return {
        "recommendations": recommendations,
        "efficiency_score": float(efficiency_score),
    }

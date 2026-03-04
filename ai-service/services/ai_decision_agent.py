"""
NEXOVA — AI Decision Agent
============================
Intelligent agent that aggregates outputs from all four ML models,
computes a unified risk score, generates human-readable recommendations,
and estimates cost savings.

This is the "brain" of the NEXOVA system: it doesn't just predict —
it DECIDES and EXPLAINS.

Design:
- Accepts raw sensor data or pre-computed model outputs
- Runs all models in parallel (when called with raw data)
- Applies a weighted fusion algorithm for the final risk score
- Generates natural-language decision summaries
- Estimates cost impact of recommended actions
"""

import os
import sys
from datetime import datetime
from typing import Dict, Any, List, Optional

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


class AIDecisionAgent:
    """
    Modular AI agent that fuses outputs from:
    - Energy Prediction Model
    - Anomaly Detection Model
    - Predictive Maintenance Model
    - Optimization Model
    
    And produces a unified decision with:
    - Overall risk score (0-100)
    - Top-priority recommended actions
    - Human-readable assessment
    - Estimated cost savings (USD/month)
    
    Usage:
        agent = AIDecisionAgent()
        decision = agent.decide(
            energy_result=...,
            anomaly_result=...,
            maintenance_result=...,
            optimization_result=...,
            raw_features=...
        )
    """

    # Risk weights for each model's contribution to the overall score
    RISK_WEIGHTS = {
        "maintenance": 0.40,    # failure risk is the most critical
        "anomaly": 0.30,        # anomalies are the second most urgent
        "energy": 0.15,         # energy waste is important but not urgent
        "optimization": 0.15,   # optimization opportunities
    }

    # Cost parameters (configurable per deployment)
    COST_PER_KWH = 0.12            # USD per kWh
    DOWNTIME_COST_PER_HOUR = 500   # USD per hour of unplanned downtime
    MAINTENANCE_COST = 200          # USD per scheduled maintenance event

    def __init__(self):
        self.decision_log: List[Dict] = []

    def decide(
        self,
        energy_result: Optional[Dict[str, Any]] = None,
        anomaly_result: Optional[Dict[str, Any]] = None,
        maintenance_result: Optional[Dict[str, Any]] = None,
        optimization_result: Optional[List[Dict[str, Any]]] = None,
        raw_features: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Aggregate all model outputs into a final decision.
        
        Args:
            energy_result: Output from energy prediction model
            anomaly_result: Output from anomaly detection model
            maintenance_result: Output from predictive maintenance model
            optimization_result: Output from optimization model (list of actions)
            raw_features: Original sensor reading (for context in recommendations)
            
        Returns:
            Comprehensive decision dict with risk_score, recommendations,
            assessment, and cost_savings.
        """
        raw_features = raw_features or {}
        timestamp = datetime.now().isoformat()
        machine_id = raw_features.get("machine_id", "UNKNOWN")

        # ---- Extract component scores ----
        scores = self._extract_scores(
            energy_result, anomaly_result, maintenance_result, optimization_result
        )

        # ---- Compute overall risk score (0-100) ----
        risk_score = self._compute_risk_score(scores)

        # ---- Determine risk level ----
        risk_level = self._risk_level(risk_score)

        # ---- Generate human-readable assessment ----
        assessment = self._generate_assessment(
            risk_score, risk_level, scores, raw_features,
            energy_result, anomaly_result, maintenance_result
        )

        # ---- Compile action recommendations ----
        actions = self._compile_actions(
            scores, optimization_result, maintenance_result, anomaly_result
        )

        # ---- Estimate cost savings ----
        cost_savings = self._estimate_cost_savings(
            scores, actions, raw_features
        )

        # ---- Build final decision object ----
        decision = {
            "timestamp": timestamp,
            "machine_id": machine_id,
            "risk_score": round(risk_score, 1),
            "risk_level": risk_level,
            "assessment": assessment,
            "recommended_actions": actions[:5],
            "cost_savings": cost_savings,
            "component_scores": scores,
            "model_outputs": {
                "energy": energy_result,
                "anomaly": anomaly_result,
                "maintenance": maintenance_result,
                "optimization_actions": len(optimization_result) if optimization_result else 0,
            },
            "confidence": self._overall_confidence(
                energy_result, anomaly_result, maintenance_result
            ),
        }

        # Log decision for audit trail
        self.decision_log.append({
            "timestamp": timestamp,
            "machine_id": machine_id,
            "risk_score": decision["risk_score"],
            "risk_level": risk_level,
            "n_actions": len(actions),
        })

        return decision

    # ------------------------------------------------------------------
    # Private methods
    # ------------------------------------------------------------------

    def _extract_scores(self, energy, anomaly, maintenance, optimization):
        """Extract normalized scores (0-1) from each model output."""
        scores = {}

        # Maintenance: failure_probability is already 0-1
        if maintenance:
            scores["maintenance"] = maintenance.get("failure_probability", 0)
        else:
            scores["maintenance"] = 0.0

        # Anomaly: anomaly_score is already 0-1
        if anomaly:
            scores["anomaly"] = anomaly.get("anomaly_score", 0)
        else:
            scores["anomaly"] = 0.0

        # Energy: compute deviation from expected as a risk factor
        if energy:
            predicted = energy.get("predicted_consumption", 0)
            # Higher-than-expected consumption = potential waste
            scores["energy"] = min(1.0, max(0, predicted / 200 - 0.5))
        else:
            scores["energy"] = 0.0

        # Optimization: if many high-priority actions, that's a signal
        if optimization:
            critical_count = sum(1 for a in optimization if a.get("priority") in ["CRITICAL", "HIGH"])
            scores["optimization"] = min(1.0, critical_count / 3)
        else:
            scores["optimization"] = 0.0

        return scores

    def _compute_risk_score(self, scores: Dict[str, float]) -> float:
        """Weighted fusion of component scores → 0-100 risk score."""
        total = 0.0
        for component, weight in self.RISK_WEIGHTS.items():
            total += scores.get(component, 0) * weight
        return total * 100

    def _risk_level(self, score: float) -> str:
        """Map risk score to categorical level."""
        if score >= 75:
            return "CRITICAL"
        elif score >= 50:
            return "HIGH"
        elif score >= 25:
            return "MEDIUM"
        else:
            return "LOW"

    def _generate_assessment(
        self, risk_score, risk_level, scores, features,
        energy_result, anomaly_result, maintenance_result
    ) -> str:
        """Generate a human-readable assessment paragraph."""
        machine = features.get("machine_id", "this machine")
        temp = features.get("temperature", 0)
        vib = features.get("vibration", 0)
        power = features.get("power_consumption", 0)

        parts = []

        # Opening
        if risk_level == "CRITICAL":
            parts.append(f"⚠️ CRITICAL ALERT for {machine}: Immediate attention required.")
        elif risk_level == "HIGH":
            parts.append(f"🔴 HIGH RISK for {machine}: Multiple warning indicators detected.")
        elif risk_level == "MEDIUM":
            parts.append(f"🟡 MODERATE RISK for {machine}: Some parameters require monitoring.")
        else:
            parts.append(f"🟢 {machine} is operating within normal parameters.")

        # Model-specific insights
        if maintenance_result:
            fp = maintenance_result.get("failure_probability", 0)
            if fp > 0.5:
                parts.append(
                    f"Failure probability is {fp:.0%} — predictive maintenance model "
                    f"flags this as {maintenance_result.get('risk_level', 'elevated')} risk."
                )
            elif fp > 0.2:
                parts.append(f"Failure probability is moderate at {fp:.0%}. Monitoring recommended.")

        if anomaly_result and anomaly_result.get("is_anomaly"):
            parts.append(
                f"Anomaly detected (score: {anomaly_result.get('anomaly_score', 0):.2f}). "
                f"Sensor patterns deviate from learned normal behavior."
            )

        if energy_result:
            predicted = energy_result.get("predicted_consumption", 0)
            if predicted > 100:
                parts.append(
                    f"Predicted energy consumption is {predicted:.1f} kW, "
                    f"which is above optimal operating range."
                )

        # Sensor summary
        if temp > 80 or vib > 6 or power > 120:
            parts.append(
                f"Current readings: Temperature={temp:.1f}°C, "
                f"Vibration={vib:.2f} mm/s, Power={power:.1f} kW."
            )

        return " ".join(parts)

    def _compile_actions(
        self, scores, optimization_result, maintenance_result, anomaly_result
    ) -> List[Dict[str, Any]]:
        """Merge and prioritize actions from all sources."""
        actions = []

        # Add optimization actions
        if optimization_result:
            for action in optimization_result:
                actions.append({
                    "action": action.get("action", "UNKNOWN"),
                    "description": action.get("description", ""),
                    "priority": action.get("priority", "LOW"),
                    "source": action.get("source", "optimization"),
                    "estimated_savings_usd": action.get("estimated_savings_usd", 0),
                })

        # Add maintenance-triggered action
        if maintenance_result and maintenance_result.get("failure_probability", 0) > 0.5:
            actions.insert(0, {
                "action": "URGENT_MAINTENANCE",
                "description": (
                    f"Failure probability {maintenance_result['failure_probability']:.0%} — "
                    f"schedule immediate inspection"
                ),
                "priority": "CRITICAL",
                "source": "maintenance_model",
                "estimated_savings_usd": self.DOWNTIME_COST_PER_HOUR * 4,  # prevent 4h downtime
            })

        # Add anomaly-triggered action
        if anomaly_result and anomaly_result.get("is_anomaly"):
            actions.append({
                "action": "INVESTIGATE_ANOMALY",
                "description": "Anomalous sensor pattern detected — investigate root cause",
                "priority": "HIGH",
                "source": "anomaly_model",
                "estimated_savings_usd": 0,
            })

        # Sort by priority
        priority_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
        actions.sort(key=lambda a: priority_order.get(a.get("priority", "LOW"), 3))

        return actions

    def _estimate_cost_savings(
        self, scores: Dict, actions: List[Dict], features: Dict
    ) -> Dict[str, Any]:
        """Estimate monthly cost savings if recommendations are followed."""
        power = features.get("power_consumption", 50)
        hours_per_month = 720

        # Direct energy savings from recommended actions
        action_savings = sum(a.get("estimated_savings_usd", 0) for a in actions[:3])

        # Avoided downtime
        failure_risk = scores.get("maintenance", 0)
        avoided_downtime_cost = failure_risk * self.DOWNTIME_COST_PER_HOUR * 8  # 8h avg downtime

        # Energy optimization
        energy_waste = scores.get("energy", 0) * power * self.COST_PER_KWH * hours_per_month * 0.1

        total = action_savings + avoided_downtime_cost + energy_waste

        return {
            "estimated_monthly_savings_usd": round(total, 2),
            "breakdown": {
                "energy_optimization": round(energy_waste, 2),
                "avoided_downtime": round(avoided_downtime_cost, 2),
                "action_specific": round(action_savings, 2),
            },
            "confidence": "HIGH" if total > 100 else "MEDIUM" if total > 20 else "LOW",
        }

    def _overall_confidence(self, energy, anomaly, maintenance) -> float:
        """Estimate the confidence of the overall decision (0-1)."""
        active_models = 0
        ml_models = 0

        for result in [energy, anomaly, maintenance]:
            if result:
                active_models += 1
                model_type = result.get("model", "")
                if "fallback" not in model_type and "heuristic" not in model_type:
                    ml_models += 1

        if active_models == 0:
            return 0.0
        return round(ml_models / max(active_models, 3), 2)

    def get_decision_log(self) -> List[Dict]:
        """Return audit trail of all decisions made."""
        return self.decision_log

    def get_stats(self) -> Dict[str, Any]:
        """Return summary statistics of decisions made."""
        if not self.decision_log:
            return {"total_decisions": 0}

        scores = [d["risk_score"] for d in self.decision_log]
        return {
            "total_decisions": len(self.decision_log),
            "avg_risk_score": round(sum(scores) / len(scores), 1),
            "max_risk_score": max(scores),
            "critical_count": sum(1 for d in self.decision_log if d["risk_level"] == "CRITICAL"),
            "high_count": sum(1 for d in self.decision_log if d["risk_level"] == "HIGH"),
        }

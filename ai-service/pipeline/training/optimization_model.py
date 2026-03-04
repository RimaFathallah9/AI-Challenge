"""
NEXOVA — Optimization Recommendation Model
============================================
Combines Reinforcement Learning (Q-Learning) with expert domain rules to
recommend energy optimization actions for industrial machines.

Architecture:
- Q-Learning agent learns optimal actions from simulated industrial states
- Domain rules provide guaranteed safety overrides (e.g., always cool if overheating)
- Actions are prioritized and returned with estimated cost savings

Actions:
  0: MAINTAIN_CURRENT  — No change needed
  1: REDUCE_LOAD       — Decrease machine load to save energy
  2: SCHEDULE_MAINTENANCE — Plan preventive maintenance
  3: ACTIVATE_COOLING  — Engage cooling systems
  4: SHUTDOWN_MACHINE  — Emergency or planned shutdown
  5: SHIFT_SCHEDULE    — Move operations to off-peak hours

Why Q-Learning (not deep RL):
- Discrete state/action space fits tabular Q-learning perfectly
- Training is fast (seconds, not hours)
- Fully interpretable: Q-table can be inspected
- No GPU required — runs anywhere
- Sufficient for the state complexity of 5-6 discretized features
"""

import os
import sys
import numpy as np
import pandas as pd
import joblib
from typing import Dict, Any, List, Tuple

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from config.settings import config


# ============================================================================
# Action definitions
# ============================================================================

ACTIONS = {
    0: {"name": "MAINTAIN_CURRENT", "description": "Continue normal operation", "base_savings": 0},
    1: {"name": "REDUCE_LOAD", "description": "Reduce machine load by 20-30%", "base_savings": 15},
    2: {"name": "SCHEDULE_MAINTENANCE", "description": "Schedule preventive maintenance within 48h", "base_savings": 8},
    3: {"name": "ACTIVATE_COOLING", "description": "Engage auxiliary cooling systems", "base_savings": 5},
    4: {"name": "SHUTDOWN_MACHINE", "description": "Initiate controlled shutdown", "base_savings": 25},
    5: {"name": "SHIFT_SCHEDULE", "description": "Move heavy operations to off-peak hours (10PM-6AM)", "base_savings": 12},
}

# ============================================================================
# State discretization bins
# ============================================================================

def discretize_state(
    temperature: float, vibration: float, power: float,
    efficiency: float, hour: float, failure_risk: float
) -> Tuple[int, ...]:
    """
    Convert continuous sensor values into a discrete state tuple for Q-table.
    
    Each feature is binned into 4 levels: low, medium, high, critical.
    """
    def bin4(val, edges):
        for i, e in enumerate(edges):
            if val < e:
                return i
        return len(edges)

    return (
        bin4(temperature, [50, 70, 90]),       # 0-3
        bin4(vibration, [3, 5, 8]),             # 0-3
        bin4(power, [30, 60, 120]),             # 0-3
        bin4(efficiency, [0.6, 0.75, 0.9]),     # 0-3
        bin4(hour, [6, 14, 22]),                # 0-3 (night/morning/afternoon/evening)
        bin4(failure_risk, [0.2, 0.5, 0.8]),    # 0-3
    )


class OptimizationModel:
    """
    RL (Q-Learning) + Domain Rules for energy optimization.
    
    Training:
        model.train(df_train)   # learns Q-table from simulated episodes
    
    Inference:
        actions = model.recommend(features_dict, failure_risk, anomaly_score)
    """

    def __init__(self):
        self.q_table: Dict[tuple, np.ndarray] = {}
        self.n_actions = len(ACTIONS)
        self.alpha = config.model.rl_alpha
        self.gamma = config.model.rl_gamma
        self.metrics: Dict[str, Any] = {}

    def _get_q(self, state: tuple) -> np.ndarray:
        """Get Q-values for a state (initialize if unseen)."""
        if state not in self.q_table:
            self.q_table[state] = np.zeros(self.n_actions)
        return self.q_table[state]

    def _reward(
        self, state: tuple, action: int,
        temperature: float, vibration: float, power: float,
        efficiency: float, failure_risk: float
    ) -> float:
        """
        Compute reward for taking an action in a given state.
        
        Rewards are designed to encourage:
        - Energy savings (positive reward for reducing waste)
        - Safety (high penalty for inaction during critical states)
        - Efficiency (bonus for maintaining high efficiency)
        """
        reward = 0.0
        action_name = ACTIONS[action]["name"]

        # ---- Energy savings reward ----
        if action_name == "REDUCE_LOAD" and power > 60:
            reward += 3.0 * (power / 100)
        elif action_name == "SHIFT_SCHEDULE" and state[4] in [1, 2]:  # during peak hours
            reward += 2.5
        elif action_name == "SHUTDOWN_MACHINE" and efficiency < 0.6:
            reward += 4.0
        elif action_name == "MAINTAIN_CURRENT" and efficiency > 0.85 and failure_risk < 0.2:
            reward += 2.0  # don't fix what isn't broken

        # ---- Safety rewards ----
        if action_name == "ACTIVATE_COOLING" and temperature > 80:
            reward += 5.0
        elif action_name == "SHUTDOWN_MACHINE" and failure_risk > 0.8:
            reward += 6.0
        elif action_name == "SCHEDULE_MAINTENANCE" and vibration > 5:
            reward += 3.0

        # ---- Penalties ----
        if action_name == "MAINTAIN_CURRENT" and failure_risk > 0.5:
            reward -= 5.0  # penalize inaction during risk
        if action_name == "SHUTDOWN_MACHINE" and failure_risk < 0.3 and efficiency > 0.8:
            reward -= 4.0  # unnecessary shutdown
        if action_name == "MAINTAIN_CURRENT" and temperature > 90:
            reward -= 3.0

        # General efficiency bonus
        reward += efficiency * 1.0

        return reward

    def train(self, df_train: pd.DataFrame) -> Dict[str, Any]:
        """
        Train Q-Learning agent from simulated episodes using training data.
        
        Each row in the training data becomes a state. The agent explores
        actions and learns optimal policies via temporal-difference updates.
        """
        print("\n🎯 Training Optimization Model (Q-Learning + Rules)")
        print("─" * 60)

        episodes = config.model.rl_episodes
        epsilon = config.model.rl_epsilon_start
        epsilon_end = config.model.rl_epsilon_end
        epsilon_decay = config.model.rl_epsilon_decay

        # Sample states from training data
        sample_size = min(len(df_train), 10000)
        sample = df_train.sample(n=sample_size, random_state=42)

        rewards_per_episode = []
        rng = np.random.default_rng(42)

        for ep in range(episodes):
            row = sample.iloc[rng.integers(0, sample_size)]
            temp = row.get("temperature", 55)
            vib = row.get("vibration", 3)
            power = row.get("power_consumption", 50)
            eff = row.get("energy_efficiency", 0.9)
            hour = row.get("hour_sin", 0) * 12 + 12  # approximate hour from sin encoding
            fail_risk = row.get("failure_label", 0) * 0.8 + rng.random() * 0.2

            state = discretize_state(temp, vib, power, eff, hour, fail_risk)
            q_vals = self._get_q(state)

            # Epsilon-greedy action selection
            if rng.random() < epsilon:
                action = rng.integers(0, self.n_actions)
            else:
                action = int(np.argmax(q_vals))

            # Compute reward
            reward = self._reward(state, action, temp, vib, power, eff, fail_risk)

            # Q-update (single-step TD)
            q_vals[action] += self.alpha * (reward - q_vals[action])
            rewards_per_episode.append(reward)

            # Decay epsilon
            epsilon = max(epsilon_end, epsilon * epsilon_decay)

        # ---- Metrics ----
        avg_reward_first = np.mean(rewards_per_episode[:500])
        avg_reward_last = np.mean(rewards_per_episode[-500:])
        self.metrics = {
            "episodes": episodes,
            "q_table_states": len(self.q_table),
            "avg_reward_first_500": float(avg_reward_first),
            "avg_reward_last_500": float(avg_reward_last),
            "reward_improvement": float(avg_reward_last - avg_reward_first),
            "final_epsilon": float(epsilon),
        }

        print(f"  Episodes trained: {episodes}")
        print(f"  Unique states explored: {len(self.q_table)}")
        print(f"  Avg reward (first 500): {avg_reward_first:.3f}")
        print(f"  Avg reward (last 500):  {avg_reward_last:.3f}")
        print(f"  Improvement: {avg_reward_last - avg_reward_first:+.3f}")

        return self.metrics

    def recommend(
        self, features: dict,
        failure_risk: float = 0.0,
        anomaly_score: float = 0.0,
    ) -> List[Dict[str, Any]]:
        """
        Recommend optimization actions for a machine.
        
        Combines RL policy with safety domain rules.
        
        Args:
            features: Sensor reading dict
            failure_risk: Predicted failure probability (from maintenance model)
            anomaly_score: Anomaly score (from anomaly model)
            
        Returns:
            List of recommended actions, sorted by priority
        """
        temp = features.get("temperature", 55)
        vib = features.get("vibration", 3)
        power = features.get("power_consumption", 50)
        eff = features.get("energy_efficiency", 0.9)

        from datetime import datetime
        ts = features.get("timestamp", datetime.now())
        if isinstance(ts, str):
            ts = pd.Timestamp(ts)
        hour = ts.hour if hasattr(ts, "hour") else 12

        state = discretize_state(temp, vib, power, eff, hour, failure_risk)
        q_vals = self._get_q(state)

        # ---- RL-based recommendations (top actions by Q-value) ----
        sorted_actions = np.argsort(q_vals)[::-1]
        recommendations = []

        for action_idx in sorted_actions:
            action_info = ACTIONS[int(action_idx)]
            q_val = float(q_vals[action_idx])
            if q_val <= 0 and len(recommendations) >= 1:
                continue  # skip unhelpful actions

            savings = self._estimate_savings(action_info, power, eff)
            recommendations.append({
                "action": action_info["name"],
                "description": action_info["description"],
                "q_value": q_val,
                "estimated_savings_kwh": savings,
                "estimated_savings_usd": round(savings * 0.12, 2),  # $0.12/kWh avg
                "priority": "HIGH" if q_val > 3 else "MEDIUM" if q_val > 1 else "LOW",
                "source": "rl_agent",
            })

        # ---- Domain rule overrides (safety-first) ----
        rule_actions = self._apply_domain_rules(temp, vib, power, eff, failure_risk, anomaly_score)
        for ra in rule_actions:
            # Insert at top if not already recommended
            existing = [r["action"] for r in recommendations]
            if ra["action"] not in existing:
                recommendations.insert(0, ra)

        return recommendations[:5]  # top 5 recommendations

    def _estimate_savings(self, action_info: dict, power: float, efficiency: float) -> float:
        """Estimate energy savings in kWh per hour."""
        base = action_info["base_savings"]
        waste_factor = max(0, 1 - efficiency) * power
        return round(base + waste_factor * 0.3, 2)

    def _apply_domain_rules(
        self, temp: float, vib: float, power: float,
        eff: float, failure_risk: float, anomaly_score: float
    ) -> List[Dict[str, Any]]:
        """
        Expert domain rules that override RL when safety is at stake.
        These are non-negotiable: if temperature > 95°C, ALWAYS recommend cooling.
        """
        rules = []

        # CRITICAL: imminent failure
        if failure_risk >= 0.8:
            rules.append({
                "action": "SHUTDOWN_MACHINE",
                "description": "CRITICAL: Failure imminent — initiate controlled shutdown immediately",
                "q_value": 10.0,
                "estimated_savings_kwh": power * 0.8,
                "estimated_savings_usd": round(power * 0.8 * 0.12, 2),
                "priority": "CRITICAL",
                "source": "domain_rule",
            })

        # CRITICAL: extreme temperature
        if temp > 95:
            rules.append({
                "action": "ACTIVATE_COOLING",
                "description": f"CRITICAL: Temperature at {temp:.1f}°C — activate emergency cooling",
                "q_value": 9.0,
                "estimated_savings_kwh": 0,
                "estimated_savings_usd": 0,
                "priority": "CRITICAL",
                "source": "domain_rule",
            })

        # HIGH: anomaly detected with high power
        if anomaly_score > 0.7 and power > 80:
            rules.append({
                "action": "REDUCE_LOAD",
                "description": f"Anomaly detected (score={anomaly_score:.2f}) with high power draw — reduce load",
                "q_value": 7.0,
                "estimated_savings_kwh": power * 0.25,
                "estimated_savings_usd": round(power * 0.25 * 0.12, 2),
                "priority": "HIGH",
                "source": "domain_rule",
            })

        # HIGH: excessive vibration
        if vib > 8:
            rules.append({
                "action": "SCHEDULE_MAINTENANCE",
                "description": f"Vibration at {vib:.2f} mm/s — schedule bearing inspection",
                "q_value": 6.0,
                "estimated_savings_kwh": 0,
                "estimated_savings_usd": 0,
                "priority": "HIGH",
                "source": "domain_rule",
            })

        # MEDIUM: low efficiency
        if eff < 0.7:
            rules.append({
                "action": "SCHEDULE_MAINTENANCE",
                "description": f"Efficiency at {eff:.0%} — inspect filters, belts, and lubrication",
                "q_value": 5.0,
                "estimated_savings_kwh": power * (1 - eff) * 0.5,
                "estimated_savings_usd": round(power * (1 - eff) * 0.5 * 0.12, 2),
                "priority": "MEDIUM",
                "source": "domain_rule",
            })

        return rules

    def save(self, model_dir: str = None):
        """Save Q-table and metadata."""
        model_dir = model_dir or config.model.model_dir
        os.makedirs(model_dir, exist_ok=True)

        joblib.dump({
            "q_table": dict(self.q_table),
            "metrics": self.metrics,
        }, os.path.join(model_dir, "optimization_qtable.pkl"))
        print(f"  ✓ Optimization model saved to {model_dir}")

    def load(self, model_dir: str = None):
        """Load persisted Q-table."""
        model_dir = model_dir or config.model.model_dir
        path = os.path.join(model_dir, "optimization_qtable.pkl")

        if os.path.exists(path):
            data = joblib.load(path)
            self.q_table = data["q_table"]
            self.metrics = data["metrics"]
            print("  ✓ Optimization model loaded")
        else:
            print("  ⚠ No optimization model found — using domain rules only")

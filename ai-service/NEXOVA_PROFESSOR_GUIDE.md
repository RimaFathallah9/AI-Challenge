# NEXOVA AI Service — Complete Professor's Guide

## A Deep-Dive Technical Walkthrough for Students

> **Version:** 3.0.0 (GPU-Accelerated)  
> **Stack:** Python 3.12 · FastAPI · PyTorch (CUDA 12.4) · XGBoost · LightGBM · scikit-learn  
> **Hardware:** Designed for NVIDIA RTX 4050 (6 GB VRAM) — auto-falls back to CPU  

---

## Table of Contents

1. [What Is NEXOVA?](#1-what-is-nexova)
2. [Architecture Overview — How Everything Connects](#2-architecture-overview)
3. [File-by-File Deep Dive](#3-file-by-file-deep-dive)
   - 3.1 [config/settings.py — The Control Panel](#31-configsettingspy)
   - 3.2 [pipeline/data_generator.py — Synthetic Data Factory](#32-pipelinedata_generatorpy)
   - 3.3 [pipeline/preprocessing.py — Data Cleaning](#33-pipelinepreprocessingpy)
   - 3.4 [pipeline/feature_engineering.py — Feature Extraction](#34-pipelinefeature_engineeringpy)
   - 3.5 [pipeline/training/energy_model.py — Energy Prediction](#35-energy_modelpy)
   - 3.6 [pipeline/training/anomaly_model.py — Anomaly Detection](#36-anomaly_modelpy)
   - 3.7 [pipeline/training/maintenance_model.py — Failure Prediction](#37-maintenance_modelpy)
   - 3.8 [pipeline/training/optimization_model.py — RL Optimizer](#38-optimization_modelpy)
   - 3.9 [pipeline/training/train_all.py — Pipeline Orchestrator](#39-train_allpy)
   - 3.10 [services/inference_engine.py — Model Serving Layer](#310-servicesinference_enginepy)
   - 3.11 [services/ai_decision_agent.py — The Brain](#311-servicesai_decision_agentpy)
   - 3.12 [main.py — FastAPI Application](#312-mainpy)
   - 3.13 [Dockerfile — Container Deployment](#313-dockerfile)
   - 3.14 [requirements.txt — Dependencies](#314-requirementstxt)
4. [ML Concepts Explained](#4-ml-concepts-explained)
5. [Data Flow — From Sensor to Decision](#5-data-flow)
6. [GPU Acceleration Architecture](#6-gpu-acceleration)
7. [How to Run Everything](#7-how-to-run)
8. [API Reference](#8-api-reference)
9. [Common Pitfalls & Lessons Learned](#9-pitfalls)

---

## 1. What Is NEXOVA?

Imagine you run a factory with 20 industrial machines — CNC mills, hydraulic presses, conveyors, compressors, and welding robots. Each machine has sensors measuring temperature, vibration, power draw, voltage, current, ambient conditions, and humidity. Every 5 minutes, those sensors send you a reading.

**The problem:** You're drowning in data. How do you know which machine is about to break? Which one is wasting electricity? When should you do maintenance?

**NEXOVA solves this** by running **four ML models** simultaneously on every sensor reading:

| Model | Question It Answers | Algorithm |
|-------|-------------------|-----------|
| **Energy** | "How much power will this machine use next hour?" | XGBoost + LightGBM ensemble |
| **Anomaly** | "Is this machine behaving abnormally?" | Isolation Forest + PyTorch Autoencoder |
| **Maintenance** | "What's the probability this machine fails soon?" | XGBoost Classifier |
| **Optimization** | "What actions should we take to save energy/prevent failure?" | Q-Learning RL + Expert Rules |

Then an **AI Decision Agent** fuses all four outputs into a single risk score (0–100), a human-readable assessment, and prioritized action recommendations with estimated cost savings in USD.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    NEXOVA AI SERVICE (v3.0.0)                       │
│                                                                     │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────────────────┐  │
│  │  FastAPI  │───▶│  Inference   │───▶│    AI Decision Agent     │  │
│  │ main.py   │    │   Engine     │    │ (Weighted Risk Fusion)   │  │
│  └──────────┘    └──────┬───────┘    └──────────────────────────┘  │
│                         │                                           │
│        ┌────────────────┼────────────────┐                         │
│        ▼                ▼                ▼                ▼        │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    │
│  │ Energy   │    │ Anomaly  │    │ Mainten. │    │ Optimiz. │    │
│  │ XGB+LGB  │    │ IF+AE    │    │ XGB-Cls  │    │ Q-Learn  │    │
│  │ (CUDA)   │    │(CUDA+CPU)│    │ (CUDA)   │    │ (CPU)    │    │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘    │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │            TRAINING PIPELINE (offline)                        │  │
│  │  data_generator → preprocessing → feature_engineering →      │  │
│  │  train_all (runs all 4 model trainers) → saves artifacts     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────┐                                      │
│  │  config/settings.py      │  ◀── single source of truth for     │
│  │  (GPUConfig, DataConfig, │      all hyperparameters, paths,    │
│  │   ModelConfig, etc.)     │      GPU settings                   │
│  └──────────────────────────┘                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Key insight:** There are two completely separate execution paths:

1. **Training path** (offline, ~12 minutes): `train_all.py` generates data → preprocesses → engineers features → trains all 4 models → saves 13 artifacts to `models/trained/`.

2. **Serving path** (real-time, ~100ms): `main.py` starts FastAPI → `InferenceEngine` loads saved models → each API request runs through feature transformation → model inference → AI agent decision → JSON response.

---

## 3. File-by-File Deep Dive

### 3.1 `config/settings.py`

**Purpose:** The single source of truth for every tunable parameter in the system.

**Why it matters:** In real ML systems, hyperparameters and paths are scattered across dozens of files. A single change (like switching from CPU to GPU) could require editing 8 files. `settings.py` centralizes everything so you change one value and the entire system adapts.

**Structure:**

```python
@dataclass
class NexovaConfig:
    gpu: GPUConfig          # GPU/CUDA settings
    data: DataConfig        # Data generation parameters
    model: ModelConfig      # ALL model hyperparameters
    features: FeatureConfig # Feature engineering params
    api: APIConfig          # Server configuration

config = NexovaConfig()     # Singleton — imported everywhere
```

**The `GPUConfig` class is particularly clever:**

```python
@dataclass
class GPUConfig:
    use_gpu: bool = True
    device: str = ""  # auto-detect if empty

    def resolve_device(self) -> str:
        if not self.use_gpu:
            return "cpu"
        try:
            import torch
            return "cuda" if torch.cuda.is_available() else "cpu"
        except (ImportError, OSError, Exception):
            return "cpu"
```

It auto-detects whether CUDA (GPU) is available at runtime. If not, everything gracefully falls back to CPU. The three different frameworks need different device strings: XGBoost wants `"cuda"`, LightGBM wants `"gpu"`, and PyTorch wants `"cuda"`. The properties `xgboost_device`, `lightgbm_device`, and `torch_device` translate accordingly.

**Key hyperparameters you can tune:**

| Parameter | Default | What it controls |
|-----------|---------|-----------------|
| `energy_n_estimators` | 500 | Number of trees in XGBoost/LightGBM |
| `anomaly_contamination` | 0.05 | Expected % of anomalies (5%) |
| `autoencoder_epochs` | 50 | Autoencoder training passes |
| `maintenance_scale_pos_weight` | 10.0 | How much to upweight rare failures |
| `rl_episodes` | 5000 | Q-Learning training iterations |
| `rolling_windows` | [12, 72, 288] | 1h, 6h, 24h at 5-min intervals |

---

### 3.2 `pipeline/data_generator.py`

**Purpose:** Generates 50,000+ rows of realistic synthetic IoT sensor data.

**Why synthetic data?** In a real factory, you'd connect to MQTT/OPC-UA sensors. For development and demonstration, we generate data that's *statistically identical* to real industrial readings.

**The five machine types** each have different operating profiles:

| Machine | Base Temp °C | Base Vibration | Base Power kW |
|---------|-------------|----------------|---------------|
| CNC_MILL | 55 | 3.5 | 45 |
| HYDRAULIC_PRESS | 65 | 5.0 | 75 |
| CONVEYOR | 40 | 2.0 | 15 |
| COMPRESSOR | 70 | 4.5 | 55 |
| WELDING_ROBOT | 80 | 2.5 | 35 |

**Realism features built in:**

1. **Diurnal pattern** — Machines run harder 6 AM–10 PM (shift schedule):
   ```python
   shift_factor = 0.4 + 0.6 * np.clip(np.sin(π * (hour - 6) / 16), 0, 1)
   ```

2. **Weekend reduction** — 40% less load on weekends:
   ```python
   weekend_factor = np.where(day_of_week >= 5, 0.6, 1.0)
   ```

3. **Seasonal variation** — Summer → higher ambient temp → harder cooling:
   ```python
   seasonal_factor = 1.0 + 0.15 * sin(2π * (day_of_year - 80) / 365)
   ```

4. **Sensor correlations** — Power, temperature, and vibration are correlated (just like in real machines):
   ```python
   temperature = temp_base + 0.25 * (power - power_base) + noise
   vibration = vib_base + 0.03 * (power - power_base) + noise
   ```

5. **Injected anomalies** (5% of data) — Five types: power spikes, dips, overheating, vibration surges, and sensor freezes.

6. **Failure degradation patterns** — Before a failure event, temperature and vibration gradually ramp up over 24–72 hours. This realistic pre-failure signature is what the maintenance model learns to detect.

7. **Energy inefficiency** — Slow efficiency decay over time (simulating filter clogging, bearing wear) plus sudden waste events.

**Data splitting:** Time-based (70% train / 15% val / 15% test). Time-based splits are critical for time-series — you never want future data leaking into training.

---

### 3.3 `pipeline/preprocessing.py`

**Purpose:** Cleans raw sensor data before ML models see it.

**The cleaning pipeline:**

| Step | What it does | Why |
|------|-------------|-----|
| Parse timestamps | `pd.to_datetime()` | Ensures consistent datetime format |
| Forward/back fill | `ffill(limit=5)` then `bfill(limit=5)` | Fills small gaps (sensor dropouts) without inventing data for long outages |
| Median impute | Fill remaining NaNs with column median | No NaN values can reach the models |
| Physical bounds clipping | e.g., temperature ∈ [5°C, 250°C] | Removes physically impossible readings (negative temperatures, etc.) |
| RobustScaler | Median + IQR normalization | More outlier-resistant than StandardScaler (which uses mean/std) |

**Why `RobustScaler` instead of `StandardScaler`?**

Standard scaling: $x' = \frac{x - \mu}{\sigma}$ — A single extreme outlier shifts $\mu$ and inflates $\sigma$, distorting all other values.

Robust scaling: $x' = \frac{x - \text{median}}{\text{IQR}}$ — The median and interquartile range (IQR = Q₃ − Q₁) are resistant to outliers. In IoT data with anomalous spikes, this is essential.

**The `fit_transform` / `transform` pattern:** The scaler is fitted on training data only (to learn median and IQR). Validation and test data are transformed using those same statistics. This prevents data leakage — the model never "sees" test data distributions during training.

---

### 3.4 `pipeline/feature_engineering.py`

**Purpose:** Transforms 7 raw sensors into 62+ rich features that make ML models much more powerful.

**Why feature engineering matters:** Raw sensor values (temperature=72, vibration=4.2) lack context. Is 72°C high? Was it 50°C an hour ago (rapidly rising → dangerous) or 73°C (stable → fine)? Feature engineering captures this context.

**Feature families:**

#### 1. Rolling Statistics (18 features)
For each of {power, temperature, vibration} × {1h, 6h, 24h windows}:
- Rolling mean: "What was the average over the last N hours?"
- Rolling std: "How volatile was it?" (high std = unstable)

```python
df[f"{col}_roll_mean_{window}"] = grouped.transform(
    lambda x: x.rolling(window, min_periods=1).mean()
)
```

#### 2. Lag Features (18 features)
Values at t−1, t−6, t−12, t−24, t−72, t−288 for power, temperature, vibration.

"What was the temperature 1 hour ago? 6 hours ago? 24 hours ago?"

This gives the model a sense of history: if temperature was 50°C 6 hours ago and is 80°C now → rapid degradation.

#### 3. Rate of Change (3 features)
Delta over 1 hour: `df[col].diff(12)` (12 steps × 5min = 1h)

"How fast is vibration increasing?" A rate of +2 mm/s per hour is more alarming than a steady 5 mm/s.

#### 4. Cyclical Time Encodings (5 features)
Hour and day-of-week encoded as sine/cosine pairs:

$$\text{hour\_sin} = \sin\left(\frac{2\pi \cdot \text{hour}}{24}\right)$$
$$\text{hour\_cos} = \cos\left(\frac{2\pi \cdot \text{hour}}{24}\right)$$

**Why sin/cos pairs?** Hour 23 and hour 0 are 1 apart in reality but 23 apart numerically. The sin/cos encoding makes them neighbors on the unit circle. Plus, a boolean `is_weekend` flag.

#### 5. Interaction Features (3 features)
- `power × temperature` — High power AND high temperature is more dangerous than either alone
- `vibration × runtime` — Vibration matters more after thousands of hours of runtime
- `current × voltage` — Apparent power (VA)

#### 6. Fleet Deviation (7 features)
For each sensor: `value − fleet_mean`

"Is this machine hotter than the fleet average?" A machine running 15°C above the fleet mean is suspicious even if 72°C is normal for that machine type.

---

### 3.5 `pipeline/training/energy_model.py`

**Purpose:** Predicts next-hour energy consumption using an XGBoost + LightGBM ensemble.

**The ML approach explained:**

**XGBoost (eXtreme Gradient Boosting)** builds an ensemble of decision trees sequentially. Each new tree tries to correct the errors of all previous trees. Think of it like this:
- Tree 1: Makes rough predictions (lots of errors)
- Tree 2: Focuses on the points Tree 1 got wrong
- Tree 3: Focuses on remaining errors
- After 500 trees: Very accurate predictions

**LightGBM** is similar but grows trees leaf-wise (deepest leaf first) instead of level-wise, making it faster on large datasets while often achieving comparable accuracy.

**Why ensemble both?** Each model has slightly different strengths. Their weighted average reduces variance:

$$\hat{y} = w_{\text{XGB}} \cdot \hat{y}_{\text{XGB}} + w_{\text{LGB}} \cdot \hat{y}_{\text{LGB}}$$

The optimal weights are found by grid search over the validation set:

```python
for w in np.arange(0.1, 1.0, 0.05):
    combo = w * xgb_pred + (1 - w) * lgb_pred
    mae = mean_absolute_error(y_val, combo)
    if mae < best_mae:
        self.xgb_weight = w
        self.lgb_weight = 1 - w
```

**Target variable:** `power_consumption` shifted by 1 time step. The model sees readings at time *t* and predicts consumption at time *t+1*.

**GPU acceleration:**
- XGBoost: `device="cuda"`, `tree_method="hist"` — histogram-based tree construction on GPU
- LightGBM: `device="gpu"` — GPU-accelerated histogram binning

**Evaluation metrics:**
- **MAE** (Mean Absolute Error): Average |predicted − actual| in kW
- **RMSE** (Root Mean Squared Error): Penalizes large errors more than MAE
- **R²** (Coefficient of Determination): 1.0 = perfect, 0.0 = predicting the mean
- **MAPE** (Mean Absolute Percentage Error): Error as a % of actual values

**Inference-time device fix:** Models trained on GPU are loaded onto CPU for inference via `set_params(device='cpu')`. Single predictions don't benefit from GPU parallelism, and this avoids a device mismatch warning.

---

### 3.6 `pipeline/training/anomaly_model.py`

**Purpose:** Detects abnormal machine behavior using two complementary techniques.

**Layer 1: Isolation Forest (CPU)**

The core idea: anomalies are "few and different." An Isolation Forest builds random trees that split features randomly. Normal points (in dense clusters) need many splits to isolate. Anomalies (far from the cluster) are isolated quickly, requiring fewer splits.

The **anomaly score** is proportional to the average path length to isolate a point:

$$s(x) = 2^{-\frac{E[h(x)]}{c(n)}}$$

Where $h(x)$ is the path length and $c(n)$ is a normalizing constant. Score close to 1 = anomaly, close to 0.5 = normal.

**Configuration:** `contamination=0.05` tells the model to expect ~5% anomalies.

**Layer 2: Autoencoder (GPU, PyTorch)**

An Autoencoder is a neural network with a "bottleneck" architecture:

```
Input (7) → 32 → 16 → [8] → 16 → 32 → Output (7)
     ╰─ encoder ──╯  ╰bottleneck╯  ╰── decoder ──╯
```

It's trained on NORMAL data only — learning to compress 7 sensor values into 8 latent dimensions and reconstruct them. For normal data, the reconstruction is accurate (low error). For anomalous data, the autoencoder hasn't learned those patterns, so **reconstruction error is high**.

$$\text{anomaly\_score} = \frac{1}{d}\sum_{i=1}^{d}(x_i - \hat{x}_i)^2$$

The threshold is set at the 95th percentile of training reconstruction errors.

**Why two layers?**
- Isolation Forest: Fast, interpretable, good at global anomalies
- Autoencoder: Captures complex non-linear patterns that tree-based methods miss
- **Union of both** → High recall (catches more anomalies)
- **Intersection** → High precision (fewer false alarms)

NEXOVA uses the union approach because in industrial settings, missing a real anomaly (false negative) is more costly than a false alarm.

**PyTorch architectural details:**
- `BatchNorm1d`: Normalizes activations per batch for stable training
- `Dropout(0.2)`: Randomly zeroes 20% of neurons during training to prevent overfitting
- `drop_last=True` in DataLoader: Avoids batches of size 1, which break BatchNorm
- Training uses `Adam` optimizer with MSE loss

**Fallback:** If neither model is loaded, a heuristic checks temperature > 90°C, vibration > 8 mm/s, and power > 200 kW.

---

### 3.7 `pipeline/training/maintenance_model.py`

**Purpose:** Predicts the probability that a machine will fail soon.

**The challenge: Severe class imbalance.** In real factories, ~97% of readings are "healthy" and only ~3% precede a failure. A naive model that always predicts "healthy" gets 97% accuracy but is useless.

**XGBoost Classifier handles this via `scale_pos_weight`:**

$$\text{scale\_pos\_weight} = \frac{\text{count}(\text{healthy})}{\text{count}(\text{failure})} \approx 32$$

This upweights failure examples during training, making the model pay 32× more attention to getting failures right.

**Output:** Not just binary (fail/don't fail) but a calibrated probability:

```python
proba = model.predict_proba(X)[0, 1]  # P(failure)
```

This probability drives the risk categorization:

| Probability | Risk Level |
|------------|------------|
| ≥ 0.80 | CRITICAL |
| ≥ 0.50 | HIGH |
| ≥ 0.20 | MEDIUM |
| < 0.20 | LOW |

**Explainability:** XGBoost provides feature importance — which sensor contributed most to the failure prediction:

```python
if hasattr(model, "feature_importances_"):
    importance = dict(zip(feature_names, model.feature_importances_))
```

This is returned as `top_risk_factors` in the API response.

**Evaluation metrics:**
- **Precision:** Of all predicted failures, what fraction were real?
- **Recall:** Of all real failures, what fraction did we catch?
- **F1-Score:** Harmonic mean of precision and recall — balanced metric
- **AUC-ROC:** Area under the Receiver Operating Characteristic curve — measures how well the model separates healthy from failing across all thresholds

---

### 3.8 `pipeline/training/optimization_model.py`

**Purpose:** Recommends energy-saving and safety actions using Reinforcement Learning.

**Q-Learning explained:**

Think of an RL agent as a factory manager learning by trial and error:
- **State:** Discretized sensor readings (temperature level, vibration level, power level, efficiency, time of day, failure risk) — each binned into 4 levels → up to 4⁶ = 4096 unique states
- **Actions:** 6 possible actions:

| Action | Description | Base Savings |
|--------|-------------|-------------|
| MAINTAIN_CURRENT | No change needed | $0 |
| REDUCE_LOAD | Decrease load 20-30% | $15/h |
| SCHEDULE_MAINTENANCE | Plan maintenance within 48h | $8/h |
| ACTIVATE_COOLING | Engage cooling systems | $5/h |
| SHUTDOWN_MACHINE | Controlled shutdown | $25/h |
| SHIFT_SCHEDULE | Move to off-peak hours | $12/h |

- **Q-Table:** A lookup table mapping (state, action) → expected reward:
  
  $$Q(s, a) \leftarrow Q(s, a) + \alpha \left[ R - Q(s, a) \right]$$

  where $\alpha$ is the learning rate and $R$ is the immediate reward.

**Reward design** is the most critical part. The reward function encodes domain expertise:
- +6.0 for shutting down when failure risk > 80% (safety)
- +5.0 for activating cooling when temperature > 80°C
- −5.0 for doing nothing when failure risk > 50% (penalize inaction)
- −4.0 for unnecessary shutdowns when everything is fine

**Exploration vs. Exploitation (ε-greedy):**
- Start with ε = 1.0 (100% random exploration)
- Decay: ε ← ε × 0.995 each episode
- End at ε = 0.01 (1% exploration, 99% exploitation)

This ensures the agent explores many actions early on, then gradually settles on the best policy.

**Domain Rule Overrides:** Safety-critical rules that ALWAYS fire regardless of the RL policy:
- Temperature > 95°C → ALWAYS recommend cooling
- Failure risk > 80% → ALWAYS recommend shutdown
- Vibration > 8 mm/s → ALWAYS recommend maintenance

**Why Q-Learning instead of Deep RL?**
1. Discrete, small state space (4096 states) — tabular Q-learning is sufficient
2. Trains in seconds, not hours
3. Fully interpretable (you can inspect the Q-table)
4. No GPU required
5. No neural network instability issues

---

### 3.9 `pipeline/training/train_all.py`

**Purpose:** Orchestrates the entire training pipeline in 5 sequential steps.

**Pipeline flow:**

```
Step 1: Data Generation (or skip if data exists)
  ↓
Step 2: Preprocessing (RobustScaler, cleaning)
  ↓
Step 3: Feature Engineering (62+ features)
  ↓
Step 4: Train all 4 models
  ├── 4a: Energy (XGBoost + LightGBM on CUDA)
  ├── 4b: Anomaly (Isolation Forest + Autoencoder on CUDA)
  ├── 4c: Maintenance (XGBoost Classifier on CUDA)
  └── 4d: Optimization (Q-Learning on CPU)
  ↓
Step 5: Save all artifacts + master metrics JSON
```

**Critical Windows-specific fix at the top of the file:**

```python
try:
    import torch
except (ImportError, OSError):
    pass
```

On Windows, PyTorch and scikit-learn both load native DLLs (`.pyd` files). If sklearn loads first, its DLLs can conflict with PyTorch's CUDA DLLs, causing silent crashes. Importing torch FIRST ensures CUDA DLLs are loaded before any conflicts can arise. This is a subtle platform-specific issue that took extensive debugging to discover.

**Artifacts saved (13 files):**

| File | Size | Contents |
|------|------|----------|
| `energy_xgb.pkl` | ~2.4 MB | Trained XGBoost regressor |
| `energy_lgb.pkl` | ~1.5 MB | Trained LightGBM regressor |
| `energy_meta.pkl` | Small | Feature names, ensemble weights, metrics |
| `anomaly_isoforest.pkl` | ~2.5 MB | Trained Isolation Forest |
| `anomaly_autoencoder.pt` | ~15 KB | PyTorch Autoencoder weights |
| `anomaly_scaler.pkl` | Small | Fitted StandardScaler for anomaly features |
| `anomaly_meta.pkl` | Small | Threshold, feature names, metrics |
| `maintenance_xgb.pkl` | ~133 KB | Trained XGBoost Classifier |
| `maintenance_meta.pkl` | ~13 KB | Feature names, importance, ROC data |
| `optimization_qtable.pkl` | ~5 KB | Q-table + training metrics |
| `feature_engineer.pkl` | Small | Fleet means, feature name list |
| `preprocessor.pkl` | Small | Fitted RobustScaler + median cache |
| `training_metrics.json` | Small | Master metrics for all models |

---

### 3.10 `services/inference_engine.py`

**Purpose:** Loads all 13 model artifacts and provides a unified prediction interface.

**Think of it as the "runtime twin" of `train_all.py`:**
- `train_all.py` trains and saves → offline, takes ~12 minutes
- `InferenceEngine` loads and serves → online, takes ~100ms per request

**The loading sequence on startup:**

```python
def _load_models(self):
    # 1. Load feature engineer (fleet means for deviation features)
    # 2. Load energy model (XGBoost + LightGBM)
    # 3. Load anomaly model (Isolation Forest + Autoencoder)
    # 4. Load maintenance model (XGBoost Classifier)
    # 5. Load optimization model (Q-table)
```

**Key design decisions:**

1. **Graceful degradation:** If any model fails to load, the system continues in "fallback" mode using heuristic predictions. It never crashes.

2. **Feature transformation at inference:** The `FeatureEngineer.transform_single()` method converts a raw sensor dict into the 62+ features the models expect. Lag/rolling features are set to 0 for single-point inference (acceptable since the base features carry most of the signal).

3. **The `full_decision()` pipeline:** Runs ALL models and feeds results into the AI Decision Agent:
   ```
   sensor_data → predict_energy() ──┐
                 detect_anomaly() ──┤
                 predict_failure() ─┤→ AIDecisionAgent.decide() → final decision
                 recommend_optim() ─┘
   ```

4. **Singleton pattern:** `get_engine()` returns a global instance — all FastAPI workers share the same loaded models in memory.

---

### 3.11 `services/ai_decision_agent.py`

**Purpose:** The "brain" that fuses four model outputs into a single actionable decision.

**This is what separates NEXOVA from a collection of models.** Individual model outputs ("anomaly score = 0.7", "failure probability = 0.3") aren't directly actionable. The agent synthesizes them.

**Weighted Risk Fusion:**

$$\text{risk\_score} = 100 \times \sum_{m} w_m \cdot s_m$$

where:

| Model $m$ | Weight $w_m$ | Score $s_m$ |
|-----------|-------------|-------------|
| Maintenance | 0.40 | failure_probability (0–1) |
| Anomaly | 0.30 | anomaly_score (0–1) |
| Energy | 0.15 | consumption / 200 − 0.5 (normalized) |
| Optimization | 0.15 | count(critical actions) / 3 |

Maintenance gets the highest weight because an imminent failure is the most costly event.

**Risk levels:**

| Score | Level | Action |
|-------|-------|--------|
| 75–100 | CRITICAL | Immediate intervention |
| 50–74 | HIGH | Urgent attention |
| 25–49 | MEDIUM | Schedule investigation |
| 0–24 | LOW | Continue monitoring |

**Human-readable assessment generation:**

The agent generates natural-language paragraphs explaining the situation:
- "⚠️ CRITICAL ALERT for MACH_0012: Immediate attention required. Failure probability is 85% — predictive maintenance model flags this as CRITICAL risk. Anomaly detected (score: 0.78). Current readings: Temperature=92.3°C, Vibration=7.8 mm/s, Power=145.2 kW."

**Cost savings estimation:**

The agent estimates monthly cost savings if all recommendations are followed:

$$\text{total\_savings} = \text{action\_savings} + \text{avoided\_downtime} + \text{energy\_waste\_reduction}$$

With configurable cost parameters:
- $0.12/kWh (electricity cost)
- $500/hour (unplanned downtime cost)
- $200/event (scheduled maintenance cost)

**Audit trail:** Every decision is logged with timestamp, machine ID, risk score, and risk level — essential for industrial compliance (ISO 55000, etc.).

---

### 3.12 `main.py`

**Purpose:** The FastAPI web server that exposes all ML capabilities as REST API endpoints.

**Framework: FastAPI** — chosen for:
1. Automatic OpenAPI documentation (Swagger UI at `/docs`)
2. Async support (handles concurrent requests)
3. Pydantic schema validation (catches bad input before it reaches models)
4. ~100x faster than Flask for concurrent workloads

**Request validation example:**

```python
class SensorData(BaseModel):
    temperature: float = Field(default=55.0, ge=0, le=300)
    vibration: float = Field(default=3.0, ge=0, le=50)
    power_consumption: float = Field(default=50.0, ge=0, le=600)
    ...
```

If someone sends `temperature=-50`, Pydantic rejects it before any model code runs, returning a 422 error with a clear explanation.

**Endpoint architecture:**

| Endpoint | Method | Purpose | Response |
|----------|--------|---------|----------|
| `/health` | GET | Service health + model status | `HealthResponse` |
| `/models/status` | GET | Detailed model versions | JSON |
| `/models/metrics` | GET | Training metrics from last run | JSON |
| `/predict-energy` | POST | Energy forecast | `EnergyResponse` |
| `/detect-anomaly` | POST | Anomaly detection | `AnomalyResponse` |
| `/predict-failure` | POST | Failure probability | `FailureResponse` |
| `/optimize` | POST | Action recommendations | `OptimizationResponse` |
| `/ai-decision` | POST | **Full AI pipeline** | `DecisionResponse` |
| `/ai-decision/batch` | POST | Fleet-wide decisions | JSON array |
| `/forecast` | POST | Legacy v2 compat | JSON |
| `/anomaly` | POST | Legacy v2 compat | JSON |
| `/recommendations` | POST | Legacy v2 compat | JSON |

**The `/ai-decision` endpoint is the primary one** — it runs all four models, feeds results to the AI agent, and returns a comprehensive decision. The Node.js backend calls this single endpoint and gets everything it needs.

**Startup lifecycle:**

```python
@app.on_event("startup")
async def startup():
    global engine
    engine = get_engine()  # Loads all 13 model artifacts
```

Models are loaded once at startup and shared across all requests — no per-request loading overhead.

**CORS middleware:**
```python
app.add_middleware(CORSMiddleware, allow_origins=["*"], ...)
```
Allows the React frontend to call the API directly during development.

---

### 3.13 `Dockerfile`

**Purpose:** Containerizes the service for deployment with GPU support.

The Dockerfile uses a **multi-stage build** with configurable base image:

```dockerfile
# GPU (default):
ARG BASE_IMAGE=nvidia/cuda:12.4.1-runtime-ubuntu22.04

# CPU override:
# docker build --build-arg BASE_IMAGE=python:3.12-slim -t nexova-cpu .
```

**Stage 1 (Builder):** Installs all Python dependencies including PyTorch with CUDA wheels.

**Stage 2 (Runtime):** Copies only the installed packages and application code — no build tools, no pip cache. This keeps the final image size smaller.

**Security:** Runs as non-root user `nexova`:
```dockerfile
RUN useradd -m -r nexova && chown -R nexova:nexova /app
USER nexova
```

**To deploy:**
```bash
# Build GPU image
docker build -t nexova-ai .

# Run with GPU access
docker run --gpus all -p 8000:8000 nexova-ai

# Or CPU-only
docker build --build-arg BASE_IMAGE=python:3.12-slim \
             --build-arg TORCH_INDEX="" -t nexova-ai-cpu .
docker run -p 8000:8000 nexova-ai-cpu
```

---

### 3.14 `requirements.txt`

**Purpose:** Declares all Python package dependencies.

| Package | Why |
|---------|-----|
| `fastapi` | Web framework for the API |
| `uvicorn[standard]` | ASGI server (runs FastAPI) |
| `pydantic` | Request/response validation |
| `httpx` | HTTP client for health checks |
| `pandas` | DataFrame operations |
| `numpy` | Numerical computing |
| `scikit-learn` | Isolation Forest, scalers, metrics |
| `joblib` | Model serialization (pickle with compression) |
| `xgboost` | Gradient boosting (energy + maintenance) |
| `lightgbm` | Gradient boosting (energy ensemble) |
| `torch` | Autoencoder neural network (CUDA) |
| `python-multipart` | File upload support (FastAPI) |
| `python-dotenv` | Environment variable management |

**PyTorch CUDA install note:**
```bash
# Standard install gets CPU-only:
pip install torch

# For GPU (CUDA 12.4):
pip install torch --index-url https://download.pytorch.org/whl/cu124
```

---

## 4. ML Concepts Explained

### Gradient Boosting (XGBoost / LightGBM)

Imagine you're trying to predict tomorrow's power consumption. You start with a simple guess (the average). It's not great.

**Boosting**: You look at where you were wrong and build a new small model focused on those errors. Then another. And another. Each successive model corrects the mistakes of all previous ones.

Mathematically, at step $t$:

$$F_t(x) = F_{t-1}(x) + \eta \cdot h_t(x)$$

where $h_t$ is a small decision tree trained on the **residuals** (errors) of $F_{t-1}$, and $\eta$ is the learning rate.

After 500 trees, you have a highly accurate ensemble.

### Isolation Forest

The core insight: **anomalies are easy to separate from normal data**.

Build a tree by randomly choosing a feature and a random split point. Normal points (clustered together) need many splits to isolate. Anomalies (far from the cluster) need very few splits.

Average path length across many random trees → anomaly score.

No labels needed — this is **unsupervised** learning.

### Autoencoders

A neural network trained to reconstruct its input through a bottleneck:

$$\text{Input} \xrightarrow{\text{compress}} \text{Latent Space} \xrightarrow{\text{decompress}} \text{Reconstruction}$$

Trained only on normal data. Anomalies produce high reconstruction errors because the network has never learned those patterns.

### Q-Learning

A values-based reinforcement learning algorithm:

1. Start with Q-values of 0 for all (state, action) pairs
2. Take an action, observe the reward
3. Update: $Q(s, a) \leftarrow Q(s, a) + \alpha[R - Q(s, a)]$
4. Repeat 5000 times
5. The optimal policy: always choose `argmax_a Q(s, a)`

---

## 5. Data Flow — From Sensor to Decision

```
SENSOR READING (JSON)
  │
  │  POST /ai-decision
  │  { machine_id: "MACH_0001", temperature: 72.5, vibration: 4.2, ... }
  │
  ▼
┌──────────────────┐
│ FastAPI Endpoint  │  (main.py) — validates input via Pydantic
└────────┬─────────┘
         ▼
┌──────────────────┐
│ InferenceEngine  │  (inference_engine.py) — routes to all 4 models
│ .full_decision() │
└────────┬─────────┘
         │
    ┌────┼────┬────────────┐
    ▼    ▼    ▼            ▼
┌──────┐┌──────┐┌────────┐┌──────┐
│Energy││Anomly││Mainten.││Optim.│
│Model ││Model ││ Model  ││Model │
└──┬───┘└──┬───┘└───┬────┘└──┬───┘
   │       │        │        │
   │  FeatureEngineer.transform_single()
   │  converts raw dict → 62 features
   │       │        │        │
   ▼       ▼        ▼        ▼
 48.3kW  score:0.7  P(fail)=  [REDUCE_LOAD,
         anomaly!   0.35      SHIFT_SCHEDULE]
         │        │        │
    └────┼────┴────────────┘
         ▼
┌──────────────────┐
│ AI Decision Agent│  (ai_decision_agent.py)
│ Weighted fusion  │  risk = 0.40×maint + 0.30×anom + 0.15×energy + 0.15×optim
│ → risk_score=43  │
│ → MEDIUM risk    │
│ → assessment     │
│ → 3 actions      │
│ → $247/mo saved  │
└────────┬─────────┘
         ▼
┌──────────────────┐
│  JSON Response   │  → Node.js Backend → React Dashboard
└──────────────────┘
```

**Total latency:** ~100ms for all 4 models + agent decision.

---

## 6. GPU Acceleration Architecture

```
┌─────────────────────────────────────┐
│  NVIDIA RTX 4050 (6 GB VRAM)       │
│                                     │
│  XGBoost (CUDA)                     │  Training: GPU histogram construction
│  → training only, inference on CPU  │  Inference: switched to CPU after load
│                                     │
│  LightGBM (GPU)                     │  Training: GPU histogram binning
│  → training + inference             │  
│                                     │
│  PyTorch Autoencoder (CUDA)         │  Training: forward/backward on GPU
│  → training + inference             │  Inference: tensor ops on GPU
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  CPU                                │
│                                     │
│  Isolation Forest (sklearn)         │  Always CPU (no GPU implementation)
│  Q-Learning                         │  Always CPU (dict-based Q-table)
│  Feature Engineering                │  Pandas operations (CPU)
│  Data Preprocessing                 │  Pandas + NumPy (CPU)
│  AI Decision Agent                  │  Pure Python logic (CPU)
└─────────────────────────────────────┘
```

**Auto-detection:** GPUConfig probes `torch.cuda.is_available()` at runtime. If CUDA is unavailable, everything transparently runs on CPU. No code changes needed.

---

## 7. How to Run Everything

### Prerequisites
- Python 3.12+
- NVIDIA GPU with CUDA 12.x (optional — CPU works too)

### Step 1: Install Dependencies

```bash
cd ai-service

# CPU only:
pip install -r requirements.txt

# With GPU (NVIDIA CUDA 12.4):
pip install torch --index-url https://download.pytorch.org/whl/cu124
pip install -r requirements.txt
```

### Step 2: Train Models

```bash
python -m pipeline.training.train_all
```

This takes ~12 minutes with GPU, ~30 minutes on CPU. Generates data, trains all 4 models, saves 13 artifacts.

### Step 3: Start the Server

```bash
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

### Step 4: Test

```bash
# Health check
curl http://localhost:8000/health

# Full AI decision
curl -X POST http://localhost:8000/ai-decision \
  -H "Content-Type: application/json" \
  -d '{"machine_id":"MACH_0001","temperature":85,"vibration":6.5,"power_consumption":120}'

# Interactive docs
open http://localhost:8000/docs
```

### Step 5: Run Automated Tests

```bash
python test_endpoints.py
# Expected: 12 passed, 0 failed
```

---

## 8. API Reference

### `POST /ai-decision` — The Primary Endpoint

**Request:**
```json
{
  "machine_id": "MACH_0001",
  "temperature": 85.0,
  "vibration": 6.5,
  "power_consumption": 120.0,
  "voltage": 378.5,
  "current": 112.0,
  "runtime_hours": 2450.0,
  "ambient_temperature": 28.3,
  "humidity": 62.0,
  "timestamp": "2025-03-04T14:30:00"
}
```

**Response:**
```json
{
  "timestamp": "2025-03-04T14:30:00",
  "machine_id": "MACH_0001",
  "risk_score": 43.6,
  "risk_level": "MEDIUM",
  "assessment": "🟡 MODERATE RISK for MACH_0001: Some parameters require monitoring. Failure probability is moderate at 21%.",
  "recommended_actions": [
    {
      "action": "REDUCE_LOAD",
      "description": "Anomaly detected (score=0.78) with high power draw — reduce load",
      "priority": "HIGH",
      "estimated_savings_usd": 3.60,
      "source": "domain_rule"
    },
    {
      "action": "SHIFT_SCHEDULE",
      "description": "Move heavy operations to off-peak hours (10PM-6AM)",
      "priority": "MEDIUM",
      "estimated_savings_usd": 1.44,
      "source": "rl_agent"
    }
  ],
  "cost_savings": {
    "estimated_monthly_savings_usd": 247.50,
    "breakdown": {
      "energy_optimization": 43.20,
      "avoided_downtime": 168.00,
      "action_specific": 36.30
    },
    "confidence": "HIGH"
  },
  "component_scores": {
    "maintenance": 0.214,
    "anomaly": 0.78,
    "energy": 0.10,
    "optimization": 0.33
  },
  "confidence": 1.0,
  "total_inference_ms": 114.0
}
```

---

## 9. Common Pitfalls & Lessons Learned

### 1. DLL Import Order on Windows
**Problem:** Importing sklearn before torch causes silent CUDA crashes — no error message, process just dies.  
**Solution:** Always `import torch` at the top of entry-point files before any sklearn-dependent imports.

### 2. XGBoost Device Mismatch
**Problem:** Model trained on `cuda:0` but inference input (pandas DataFrame) is on CPU → warning flood.  
**Solution:** After loading, call `model.set_params(device='cpu')` for inference. Single predictions don't need GPU.

### 3. BatchNorm1d with Batch Size 1
**Problem:** During autoencoder training, the last batch may have only 1 sample, causing `ValueError` in BatchNorm.  
**Solution:** `DataLoader(drop_last=True)` — drop incomplete final batches.

### 4. Time Series Data Leakage
**Problem:** Random train/test split on time series → model sees future data during training → inflated metrics.  
**Solution:** Time-based split (first 70% → train, next 15% → val, last 15% → test).

### 5. Pandas Deprecation Warnings
**Problem:** `df.fillna(method="ffill")` deprecated in pandas 2.x.  
**Solution:** Use `df.ffill()` and `df.bfill()` instead.

### 6. Class Imbalance in Failure Prediction
**Problem:** Only 3% of data are failures. Model predicts "healthy" for everything → 97% accuracy, zero usefulness.  
**Solution:** `scale_pos_weight` in XGBoost upweights positive (failure) class. Evaluate with F1-score and AUC-ROC, not accuracy.

### 7. Cyclical Feature Encoding
**Problem:** Hour 23 and hour 0 are 23 apart numerically but 1 apart in reality.  
**Solution:** Encode as sin/cos pairs: `sin(2πh/24)` and `cos(2πh/24)`. Now hour 23 and 0 are neighbors on the unit circle.

---

*This guide was written for the NEXOVA v3.0.0 GPU-accelerated release. For questions about the Node.js backend, React frontend, or Docker Compose deployment, see the project root `README.md`.*

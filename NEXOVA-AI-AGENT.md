# 🤖 NEXOVA Autonomous AI Agent - Complete Feature Guide

## Overview

The **NEXOVA Autonomous AI Agent** is the intelligent decision-making brain of the NEXOVA platform. It continuously analyzes IoT sensor data, predicts machine failures, optimizes energy consumption, and makes autonomous decisions to keep your factory running optimally.

The AI Agent operates on 8 core intelligent features that work together to provide comprehensive industrial automation.

---

## 🚀 Quick Start

### Get Complete AI Analysis for a Machine

```bash
GET /api/ai-agent/dashboard?machineId=<machine-id>
Authorization: Bearer <JWT_TOKEN>
```

**Response includes all 8 features in one call:**
```json
{
  "success": true,
  "machineId": "cmm5ljo5o03d0su86io57yxpk",
  "executiveReport": {
    "healthStatus": "HEALTHY",
    "overallScore": 85.5,
    "keyIssues": [...],
    "recommendedActions": [...],
    "estimatedROI": 2500
  },
  "features": {
    "1_monitoring": {...},
    "2_anomalies": {...},
    "3_maintenance": {...},
    "4_energy": {...},
    "5_decision": {...},
    "6_xai": {...},
    "8_fusion": {...}
  }
}
```

---

## 📊 The 8 Core Features

### 1️⃣ **Real-Time Industrial Monitoring**

**Purpose:** Continuously analyzes sensor data and classifies machine state

**Endpoint:**
```
GET /api/ai-agent/machines/:machineId/monitor
```

**Models Used:**
- Time-Series Analysis (LSTM/Transformer patterns)
- Statistical Monitoring
- Real-time Stream Processing

**What It Does:**
- Monitors temperature, vibration, power, and production metrics
- Classifies machine state: `NORMAL` / `WARNING` / `CRITICAL`
- Calculates abnormality score (0-1) with 1000+ data points

**Response:**
```json
{
  "machineId": "cmm5ljo5o03d0su86io57yxpk",
  "machineName": "Air #123",
  "state": "WARNING",
  "abnormalityScore": 0.45,
  "currentMetrics": {
    "power": 18.5,
    "temperature": 78.2,
    "vibration": 3.8,
    "runtime": 8764,
    "production": 450
  }
}
```

**Use Cases:**
- Real-time production monitoring dashboards
- Live health status indicators
- Trend analysis and historical comparison

---

### 2️⃣ **Intelligent Anomaly Detection**

**Purpose:** Detects overheating, energy spikes, and hidden abnormal patterns

**Endpoint:**
```
GET /api/ai-agent/machines/:machineId/anomalies
```

**Models Used:**
- Autoencoder for pattern recognition
- Isolation Forest for outlier detection
- Statistical deviation analysis (z-score)
- Transformer-based anomaly models

**Detection Types:**
- 🌡️ **OVERHEAT** - Temperature spikes or sustained high heat
- 📳 **VIBRATION** - Abnormal oscillation patterns
- ⚡ **LOAD_SPIKE** - Unexpected power consumption increase
- 📉 **EFFICIENCY_DROP** - Sustained efficiency degradation

**Response:**
```json
{
  "anomalyDetected": true,
  "count": 2,
  "data": [
    {
      "anomalyType": "OVERHEAT",
      "severity": "HIGH",
      "confidence": 0.92,
      "description": "Temperature 85°C (normal: 65°C)",
      "currentValue": 85.2,
      "normalValue": 65.4,
      "suggestedAction": "Activate cooling system, increase ventilation"
    }
  ]
}
```

**Confidence Levels:**
- High confidence (>0.8): Immediate action recommended
- Medium confidence (0.5-0.8): Monitor closely
- Low confidence (<0.5): False positive likely

---

### 3️⃣ **Predictive Maintenance Engine**

**Purpose:** Predicts machine failures and recommends maintenance timing

**Endpoint:**
```
GET /api/ai-agent/machines/:machineId/maintenance
```

**Models Used:**
- LSTM (Long Short-Term Memory) for temporal patterns
- Temporal Fusion Transformer (TFT) for multivariate prediction
- Regression models for Remaining Useful Life (RUL)

**Calculates:**
- **Failure Probability** (0-1): Risk of breakdown
- **RUL (Remaining Useful Life)**: Days until maintenance needed
- **Maintenance Type**: Preventive / Predictive / Condition-Based
- **Priority**: LOW / MEDIUM / HIGH / URGENT

**Response:**
```json
{
  "failureProbability": 0.62,
  "estimatedRUL": 28,
  "failureType": "Bearing Wear/Misalignment",
  "maintenanceType": "PREDICTIVE",
  "recommendedSchedule": {
    "daysUntil": 28,
    "priority": "HIGH",
    "estimatedDowntime": 2,
    "estimatedCost": 2000
  }
}
```

**Degradation Indicators Monitored:**
1. Power consumption trend
2. Temperature trend
3. Vibration trend
4. Machine age vs failure history
5. Component wear patterns (calculated from sensor data)

**Decision Logic:**
- RUL < 7 days → URGENT priority
- RUL 7-30 days → HIGH priority
- RUL 30-90 days → MEDIUM priority
- RUL > 90 days → LOW priority

---

### 4️⃣ **Energy Optimization Intelligence**

**Purpose:** Suggests load balancing and energy-saving strategies

**Endpoint:**
```
GET /api/ai-agent/machines/:machineId/optimize-energy
```

**Models Used:**
- Reinforcement Learning for dynamic optimization
- Optimization algorithms (gradient descent, genetic algorithms)
- Gradient boosting for impact prediction
- Historical pattern analysis

**Analyzes:**
- Weekly energy consumption patterns
- Load variance and peak demands
- Temperature-power correlation
- Vibration losses
- Efficiency metrics

**Recommendations Include:**
1. **Cooling System Optimization** (15-20% savings potential)
   - Upgrade cooling systems
   - Active cooling installation
   - Thermal management improvements

2. **Alignment & Balancing** (40% vibration reduction)
   - Dynamic balancing
   - Precision alignment
   - Bearing optimization

3. **Load Balancing** (up to 12% savings potential)
   - Peak demand reduction
   - Production scheduling
   - Multi-machine coordination

4. **Variable Frequency Drive (VFD)** (10-15% savings)
   - Dynamic speed control
   - Load-based adaptation
   - Energy-efficient operation

5. **Preventive Maintenance** (8% efficiency restoration)
   - Component restoration
   - Wear compensation
   - Performance recovery

**Response:**
```json
{
  "machineId": "cmm5ljo5o03d0su86io57yxpk",
  "currentEnergyCost": 2456.50,
  "baselineEnergy": 15.2,
  "optimizedEnergy": 13.8,
  "potentialSavings": 587.25,
  "recommendations": [
    {
      "action": "Improve cooling efficiency to reduce operating temperature",
      "impactPercentage": 12.5,
      "implementationTime": "2-3 days",
      "riskLevel": "LOW"
    }
  ]
}
```

**ROI Calculation:**
- Monthly savings × 12 - Implementation cost = Annual ROI
- Example: $500/month savings - $2000 cost = $4000/year ROI

---

### 5️⃣ **Autonomous Decision-Making System**

**Purpose:** Makes intelligent decisions based on all factors

**Endpoint:**
```
POST /api/ai-agent/machines/:machineId/decide
```

**Models Used:**
- Large Language Model (LLM) for reasoning
- Rule-based safety layer
- Weighted decision algorithm
- Risk assessment engine

**Decision Types:**
- **CONTINUE**: Machine operating optimally ✅
- **REDUCE_LOAD**: Production speed reduction needed ⚙️
- **ACTIVATE_COOLING**: Thermal management activation ❄️
- **SCHEDULE_MAINTENANCE**: Preventive maintenance needed 🔧

**Decision Factors (Priority Order):**
1. **Temperature > 90°C** → ACTIVATE_COOLING (confidence: 0.95)
2. **Vibration > 6 mm/s** → REDUCE_LOAD (confidence: 0.90)
3. **Failure Probability > 0.8** → SCHEDULE_MAINTENANCE (confidence: 0.85)
4. **Critical State** → REDUCE_LOAD (confidence: 0.80)
5. **Warning State with High Temp** → ACTIVATE_COOLING
6. **Warning State with High Vibration** → REDUCE_LOAD
7. **Normal State** → CONTINUE (confidence: 1.0)

**Response:**
```json
{
  "decision": "ACTIVATE_COOLING",
  "confidence": 0.92,
  "reasoning": {
    "mainFactor": "Critical temperature detected",
    "explanation": "Temperature is 88°C. Activating cooling to prevent thermal damage.",
    "considerFactors": [
      "Temperature critically high",
      "Potential strain on motor"
    ],
    "safetyMargin": 0.08
  },
  "actionableInsights": [
    "✓ Activate secondary cooling system",
    "✓ Increase ventilation rate",
    "✓ Monitor temperature every 5 minutes"
  ],
  "estimatedImpact": {
    "energySavings": 0,
    "riskReduction": 45.2,
    "costImpact": -100
  }
}
```

**Implementation:** The frontend receives the decision and can:
- Auto-execute via IoT commands
- Alert operator for approval
- Log decision for audit trail
- Learn from outcomes

---

### 6️⃣ **Explainable AI (XAI) Layer**

**Purpose:** Converts complex data into simple human-readable explanations

**Endpoint:**
```
GET /api/ai-agent/machines/:machineId/report
```

**Models Used:**
- LLM reasoning layer for explanation generation
- SHAP-style explainability tools
- Dashboard translation engine

**Generates:**
- Executive summaries for managers
- Machine health score (0-100)
- Key issues list with severity
- Recommended actions with rationale
- ROI predictions

**Response:**
```json
{
  "executiveSummary": {
    "healthStatus": "AT_RISK",
    "overallScore": 68.5,
    "keyIssues": [
      "🚨 Machine in WARNING state",
      "⚠️ 2 critical anomalies detected",
      "⏰ High failure risk (65%) - RUL: 2 days",
      "💰 Significant energy savings potential: $587"
    ],
    "recommendedActions": [
      "Machine is operating with elevated stress...",
      "✓ Reduce production speed to 80%",
      "✓ Increase break intervals",
      "✓ Schedule inspection within 24 hours"
    ],
    "estimatedROI": 1587
  },
  "monitoring": {...},
  "anomalies": {...},
  "predictiveMaintenance": {...},
  "energyOptimization": {...},
  "autonomousDecision": {...}
}
```

**Health Status Mapping:**
- **HEALTHY** (score > 73): All metrics optimal, no action needed
- **AT_RISK** (score 50-73): Attention required, monitor closely
- **CRITICAL** (score < 50): Immediate action required

---

### 7️⃣ **Continuous Learning System**

**Purpose:** Records and learns from past decisions to improve over time

**Endpoints:**
```
POST /api/ai-agent/machines/:machineId/feedback
GET /api/ai-agent/machines/:machineId/history?limit=50
```

**Models Used:**
- Online learning algorithms
- Reinforcement learning updates
- Bayesian belief networks
- Adaptive thresholds

**Learning Process:**
1. Record human feedback on decisions
2. Calculate improvement score (-1 to 1)
3. Update model weights
4. Adjust decision thresholds
5. Retrain optimization parameters

**Record Feedback:**
```
POST /api/ai-agent/machines/cmm5ljo5o03d0su86io57yxpk/feedback
Body:
{
  "decision": "REDUCE_LOAD",
  "outcome": "Machine temperature normalized, production quality improved",
  "improvement": 0.85
}
```

**Improvement Scoring:**
- **1.0**: Perfect decision, exactly the right call
- **0.5**: Good decision, positive outcome
- **0.0**: Neutral, no significant change
- **-0.5**: Suboptimal, minor negative impact
- **-1.0**: Poor decision, significant harm

**Learning History:**
```json
{
  "count": 42,
  "data": [
    {
      "decision": "ACTIVATE_COOLING",
      "outcome": "Temperature reduced within 10 minutes",
      "improvement": 0.9,
      "timestamp": "2026-02-28T15:30:00Z",
      "feedbackSource": "HUMAN"
    }
  ]
}
```

**Continuous Improvements:**
- Error rates decrease over time
- Decision confidence increases
- Threshold adjustments become more precise
- Energy savings recommendations optimize
- RUL predictions become more accurate

---

### 8️⃣ **Multi-Source Data Fusion**

**Purpose:** Combines IoT sensor data with production/ERP data

**Endpoint:**
```
GET /api/ai-agent/machines/:machineId/fuse
```

**Models Used:**
- Transformer-based multimodal processing
- Data aggregation networks
- Cross-modal fusion algorithms
- Heterogeneous data integration

**Data Sources Combined:**
1. **IoT Sensors**
   - Power consumption
   - Temperature
   - Vibration
   - Runtime hours
   - Production speed

2. **Production/ERP Data**
   - Units produced per hour
   - Quality metrics
   - Material used
   - Process parameters

3. **Optional Vision Data** (ready for integration)
   - Surface quality inspection
   - Component alignment
   - Physical damage detection

**Response:**
```json
{
  "iotData": {
    "power": 18.5,
    "temperature": 78.2,
    "vibration": 3.8,
    "production": 450,
    "runtime": 8764
  },
  "productionData": {
    "avgProduction": 450,
    "totalRuntime": 168,
    "dataPoints": 24
  },
  "fused": {
    "operationalMetrics": {
      "power": 18.5,
      "temperature": 78.2,
      "productionRate": 450,
      "productionEfficiency": 85,
      "costPerUnit": 0.041
    },
    "integratedInsights": {
      "energyToProduction": 0.041,
      "utilization": 95.5,
      "quality": 92
    }
  }
}
```

**Integrated Metrics:**
- **Energy to Production Ratio**: kW per unit produced
- **Utilization Rate**: % of time machine is running
- **Quality Score**: Estimated product quality (0-100)
- **Cost per Unit**: All-in operational cost

---

## 📈 Getting AI Agent Status for All Machines

```
GET /api/ai-agent/status?factoryId=optional
```

**Response:**
```json
{
  "success": true,
  "summary": {
    "totalMachines": 12,
    "healthy": 8,
    "atRisk": 3,
    "critical": 1,
    "avgHealthScore": 76.8,
    "totalEnergySavingsPotential": 4525.50
  },
  "machines": [
    {
      "machineId": "cmm5ljo5o03d0su86io57yxpk",
      "machineName": "Air #123",
      "healthStatus": "AT_RISK",
      "overallScore": 68.5,
      "keyIssues": ["Temperature rising", "RUL: 28 days"],
      "recommendedActions": ["Activate cooling", "Schedule maintenance"]
    }
  ]
}
```

---

## 🎯 Complete Dashboard View

**Get everything in one call:**

```
GET /api/ai-agent/dashboard?machineId=cmm5ljo5o03d0su86io57yxpk
```

Returns all 8 features with:
- Executive report with ROI estimates
- Real-time monitoring status
- All detected anomalies
- Maintenance predictions
- Energy optimization opportunities
- Current autonomous decision
- XAI explanations
- Fused data insights

---

## 🔗 Integration Examples

### React Component Integration

```typescript
import { aiAgentApi } from '../services/api';

function MachineAIAgent({ machineId }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  // Get complete AI analysis
  const analyzeMachine = async () => {
    setLoading(true);
    try {
      const response = await aiAgentApi.getDashboard(machineId);
      setReport(response.data);
    } catch (error) {
      console.error('Analysis failed:', error);
    }
    setLoading(false);
  };

  return (
    <div>
      <button onClick={analyzeMachine}>Analyze Machine</button>
      {report && (
        <>
          <div className="health-score">
            Score: {report.executiveReport.overallScore}/100
            Status: {report.executiveReport.healthStatus}
          </div>
          <div className="recommendations">
            {report.executiveReport.recommendedActions.map((action, i) => (
              <p key={i}>{action}</p>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
```

### Individual Feature Queries

```typescript
// Just anomaly detection
const anomalies = await aiAgentApi.detectAnomalies(machineId);

// Just energy optimization
const optimization = await aiAgentApi.optimizeEnergy(machineId);

// Just maintenance prediction
const maintenance = await aiAgentApi.predictMaintenance(machineId);

// Make autonomous decision
const decision = await aiAgentApi.makeDecision(machineId);
```

---

## 📊 Sample Data Flow

```
Raw IoT Data (100 readings/hour)
    ↓
Real-Time Monitoring (Feature #1)
    ↓
Anomaly Detection (Feature #2) → {severity, confidence, action}
    ↓
Maintenance Prediction (Feature #3) → {RUL, priority, cost}
    ↓
Energy Optimization (Feature #4) → {savings potential, recommendations}
    ↓
Autonomous Decision (Feature #5) → {decision, confidence, reasoning}
    ↓
XAI Report (Feature #6) → {explanation, health score, ROI}
    ↓
Learning System (Feature #7) → {feedback recorded, model improved}
    ↓
Data Fusion (Feature #8) → {integrated metrics, quality estimates}
```

---

## 🔒 Authentication

All AI Agent endpoints require JWT authentication:

```
Authorization: Bearer <JWT_TOKEN>
```

Get token via:
```
POST /api/auth/login
Body: { email: "user@company.com", password: "..." }
```

---

## 📋 Best Practices

1. **Real-Time Monitoring**: Call `/monitor` every 5-10 seconds
2. **Anomaly Checking**: Call `/anomalies` every minute
3. **Maintenance Planning**: Call `/maintenance` daily or weekly
4. **Energy Optimization**: Call `/optimize-energy` weekly
5. **Decision Making**: Call `/decide` when state changes
6. **Feedback Recording**: Always record outcomes for learning
7. **Dashboard**: Use `/dashboard` for complete analysis

---

## 🚦 Health Score Thresholds

| Score | Status | Action |
|-------|--------|--------|
| 90-100 | Optimal | Monitor routinely |
| 75-89 | Healthy | Check weekly |
| 50-74 | At Risk | Monitor closely, plan maintenance |
| 25-49 | Critical | Immediate action required |
| 0-24 | Failure Imminent | Stop operations |

---

## 💡 Key Metrics Overview

**From Feature #1 (Monitoring):**
- Power, Temperature, Vibration, Runtime, Production

**From Feature #2 (Anomalies):**
- Anomaly type, severity, confidence score

**From Feature #3 (Maintenance):**
- Failure probability, RUL days, maintenance type

**From Feature #4 (Energy):**
- Current cost, optimized cost, potential savings

**From Feature #5 (Decision):**
- Decision type, confidence, actionable insights

**From Feature #6 (XAI):**
- Health status, overall score, key issues, ROI

**From Feature #8 (Fusion):**
- Energy/production ratio, utilization rate, quality score

---

## 🎓 Advanced Topics

### Confidence Scoring
The AI Agent assigns confidence scores to decisions (0-1):
- **0.95+**: High confidence, safe to auto-execute
- **0.8-0.95**: Medium confidence, alert operator
- **0.5-0.8**: Low confidence, human review recommended
- **<0.5**: Very low, likely false positive

### Safety Margins
All decisions calculate a safety margin (0-1):
- Margin = Available operating range / Current gap to limit
- Example: (90°C limit - 78°C current) / 20°C = 0.60 margin
- Smaller margin = More urgent action needed

### ROI Estimation
Calculated as:
```
ROI = (Monthly Energy Savings × 12) - (Implementation Cost) - (Maintenance Cost)
```

Example:
- $500/month savings × 12 = $6,000/year
- Implementation cost = $2,000
- Annual ROI = $4,000

---

## 📞 Support

For issues or questions about the AI Agent:
1. Check error response messages
2. Review logs: `/var/log/nexova/ai-agent.log`
3. Verify JWT token validity
4. Check machine has historical data (>10 readings)

All AI Agent features work independently - if one fails, others continue operating.

---

**NEXOVA Autonomous AI Agent** | v1.0 | February 2026

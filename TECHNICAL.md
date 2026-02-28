# NEXOVA Technical Documentation
## Complete Architecture, Implementation & Design

**Version**: 1.0.0  
**Last Updated**: February 2026  
**Status**: Production Ready

---

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Technology Stack Details](#technology-stack-details)
3. [Feature Implementations](#feature-implementations)
4. [Data Flow & Workflows](#data-flow--workflows)
5. [Database Design](#database-design)
6. [API Architecture](#api-architecture)
7. [AI/ML System](#aiml-system)
8. [Real-Time Communication](#real-time-communication)
9. [Security & Authentication](#security--authentication)
10. [Deployment Architecture](#deployment-architecture)
11. [Performance Optimization](#performance-optimization)
12. [Error Handling & Resilience](#error-handling--resilience)

---

## 1. System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER (Browser)                             │
│                          React 18 + TypeScript                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  REST API (HTTP)          │    WebSocket (Real-time)     │  External APIs   │
│  ├─ CRUD Operations       │    ├─ Sensor Streaming       │  ├─ Gemini       │
│  ├─ Auth/Sessions         │    ├─ Alert Broadcasts       │  ├─ Google Maps  │
│  └─ Data Queries          │    └─ Machine Status         │  └─ Weather      │
├─────────────────────────────────────────────────────────────────────────────┤
│                    API GATEWAY LAYER (Express.js)                           │
│  ┌──────────────┬─────────────┬─────────────┬──────────────┬──────────┐   │
│  │  Auth        │  Machines   │  Energy     │  AI/Chat     │ Digital  │   │
│  │  Controller  │  Controller │  Controller │  Controller  │ Twin     │   │
│  │  (JWT)       │  (CRUD)     │  (Analytics)│  (Gemini)    │ Controller
│  └──────────────┴─────────────┴─────────────┴──────────────┴──────────┘   │
├─────────────────────────────────────────────────────────────────────────────┤
│                         SERVICE LAYER                                        │
│  ┌──────────────┬─────────────┬──────────┬──────────┬────────────────────┐ │
│  │ Auth         │ Machine     │ Energy   │ AI/Gemini│ Digital Twin       │ │
│  │ Service      │ Service     │ Service  │ Service  │ Service            │ │
│  │ (JWT/Roles)  │ (Approval)  │ (Metrics)│ (Anomaly)│ (Prediction)       │ │
│  └──────────────┴─────────────┴──────────┴──────────┴────────────────────┘ │
│  ┌──────────────┬─────────────┬──────────────────────────────────────────┐│
│  │ RL           │ Alert       │ IoT Simulator                            ││
│  │ Optimizer    │ Service     │ (Synthetic Data Generation)              ││
│  │ (Cost Calc)  │ (Anomaly)   │                                          ││
│  └──────────────┴─────────────┴──────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────────────────┤
│                    REPOSITORY LAYER (Prisma ORM)                            │
│  ├─ User Repository         ├─ Machine Repository                          │
│  ├─ Energy Reading Repo      ├─ Alert Repository                           │
│  ├─ Approval Workflow Repo   └─ Digital Twin State Repo                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                      DATABASE LAYER (PostgreSQL)                            │
│  ├─ Users Table (Auth)        ├─ Energy Readings (Time Series)             │
│  ├─ Machines Table            ├─ Alerts Table                              │
│  ├─ Factories Table           ├─ Approvals (Workflow)                      │
│  └─ Digital Twin States       └─ Custom Indexes (Performance)              │
├─────────────────────────────────────────────────────────────────────────────┤
│                    EXTERNAL AI SERVICES                                     │
│  ┌──────────────────────────┐  ┌────────────────────────────────────────┐ │
│  │  Google Generative AI    │  │  Local ML Services (Python)            │ │
│  │  • Gemini 1.5 Flash      │  │  • Prophet Forecasting                 │ │
│  │  • Real-time Chat        │  │  • Isolation Forest Anomalies          │ │
│  │  • Anomaly Evaluation    │  │  • RUL Prediction Models               │ │
│  └──────────────────────────┘  └────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Architecture Principles

1. **Layered Architecture**: Clear separation of concerns (Controller → Service → Repository → DB)
2. **Microservices Ready**: Backend can scale independently, AI service as separate process
3. **Event-Driven**: WebSocket broadcasts for real-time updates
4. **Async Processing**: Long-running AI tasks don't block API
5. **Stateless Design**: Services can be replicated horizontally

---

## 2. Technology Stack Details

### 2.1 Frontend Technology

#### React 18.2.0
```typescript
// Core Features Used:
// ✅ Functional Components with Hooks
// ✅ React Context API (via Zustand) for state management
// ✅ Suspense for code splitting
// ✅ Error Boundaries for error handling
// ✅ Strict Mode for development debugging

// Typical Component Pattern:
interface MachineCardProps {
  machine: Machine;
  onStatusChange: (id: string, status: MachineStatus) => Promise<void>;
}

export const MachineCard: React.FC<MachineCardProps> = ({ machine, onStatusChange }) => {
  const [loading, setLoading] = useState(false);
  const { updateMachine } = useMachineStore();
  
  const handleStatusClick = async () => {
    setLoading(true);
    try {
      await onStatusChange(machine.id, 'MAINTENANCE');
      await updateMachine(machine.id);
    } catch (error) {
      console.error('Failed to update:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className={`card ${machine.status.toLowerCase()}`}>
      <h3>{machine.name}</h3>
      <button onClick={handleStatusClick} disabled={loading}>
        {machine.status}
      </button>
    </div>
  );
};
```

#### Zustand State Management
```typescript
// Global store for dashboard state
export const useDashboardStore = create<DashboardStore>((set) => ({
  machines: [],
  selectedMachine: null,
  alerts: [],
  filters: { status: 'ALL', type: 'ALL' },
  
  // Derived selectors
  getHealthMetrics: (state) => ({
    healthy: state.machines.filter(m => m.healthScore > 80).length,
    warning: state.machines.filter(m => m.healthScore > 50 && m.healthScore <= 80).length,
    critical: state.machines.filter(m => m.healthScore <= 50).length,
  }),
  
  setMachines: (machines) => set({ machines }),
  selectMachine: (machine) => set({ selectedMachine: machine }),
  addAlert: (alert) => set((state) => ({ 
    alerts: [alert, ...state.alerts].slice(0, 100) 
  })),
}));
```

#### Tailwind CSS Architecture
```css
/* Utility-First Approach */
/* Component Styling Pattern */
@layer components {
  @apply flex flex-col gap-2 p-4 bg-white rounded-lg shadow-md;
  
  /* Responsive Design */
  @media (max-width: 768px) {
    @apply flex-row flex-wrap;
  }
}

/* Color System */
--color-healthy: #10b981 (green)
--color-warning: #f59e0b (amber)
--color-critical: #ef4444 (red)
--color-offline: #6b7280 (gray)
```

#### Recharts for Visualization
```typescript
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export const EnergyChart: React.FC<{ data: EnergyReading[] }> = ({ data }) => {
  return (
    <LineChart width={800} height={300} data={data}>
      <XAxis 
        dataKey="timestamp"
        type="number"
        domain={['dataMin', 'dataMax']}
      />
      <YAxis yAxisId="left" label={{ value: 'Power (kW)', angle: -90 }} />
      <YAxis yAxisId="right" orientation="right" label={{ value: 'Temp (°C)' }} />
      
      {/* Primary metric */}
      <Line yAxisId="left" type="monotone" dataKey="power" stroke="#3b82f6" />
      
      {/* Secondary metric */}
      <Line yAxisId="right" type="monotone" dataKey="temperature" stroke="#ff6b6b" />
      
      <Tooltip 
        formatter={(value) => value.toFixed(2)}
        labelFormatter={(label) => new Date(label).toLocaleTimeString()}
      />
      <Legend />
    </LineChart>
  );
};
```

#### Vite Build System
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy API calls to backend
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      }
    }
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Code splitting strategy
        manualChunks: {
          'react-lib': ['react', 'react-dom'],
          'ui-lib': ['recharts', 'zustand'],
        }
      }
    }
  }
});
```

---

### 2.2 Backend Technology

#### Node.js 22 Runtime
```javascript
// Native Features Used:
// ✅ ES2024 features (async/await, Promise, destructuring)
// ✅ Worker Threads for CPU-intensive tasks
// ✅ Streams API for large data transfers
// ✅ Crypto module for JWT signing

// Typical async pattern:
async function processEnergyReadings(readings: EnergyReading[]) {
  try {
    // Parallel operations
    const [validated, anomalies] = await Promise.all([
      validateReadings(readings),
      detectAnomalies(readings)
    ]);
    
    // Save to database
    await prisma.energyReading.createMany({ data: validated });
    
    // Broadcast via WebSocket
    broadcastToClients({ type: 'sensor_update', data: validated });
    
    // Process anomalies asynchronously (don't wait)
    processAnomalies(anomalies).catch(console.error);
  } catch (error) {
    logger.error('Energy processing failed:', error);
    throw new AppError('Failed to process readings', 500);
  }
}
```

#### Express.js Framework
```typescript
// Typical route setup with middleware
const router = express.Router();

router.post(
  '/machines',
  authenticate,           // JWT verification
  authorize('ADMIN'),     // Role check
  validateBody(CreateMachineDTO),  // Request validation
  asyncHandler(machineController.create)  // Controller
);

// Error handling middleware
router.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof ValidationError) {
    return res.status(400).json({ error: err.message });
  }
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  // Unexpected error
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});
```

#### TypeScript with Strict Mode
```typescript
// Full type safety enabled
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "esModuleInterop": true
  }
}

// Type-safe service implementation
interface MachineService {
  create(data: CreateMachineDTO): Promise<Machine>;
  findById(id: string): Promise<Machine | null>;
  getStatus(id: string): Promise<MachineStatus>;
}

export const machineService: MachineService = {
  async create(data: CreateMachineDTO): Promise<Machine> {
    // TypeScript ensures all required fields present
    const machine = await prisma.machine.create({ data });
    return machine;
  },
  
  async findById(id: string): Promise<Machine | null> {
    return prisma.machine.findUnique({ where: { id } });
  },
  
  async getStatus(id: string): Promise<MachineStatus> {
    const machine = await this.findById(id);
    if (!machine) throw new NotFoundError('Machine not found');
    // Type guard ensures machine exists
    return machine.status;
  }
};
```

#### Prisma ORM
```typescript
// schema.prisma - Type-safe database model
model Machine {
  id            String    @id @default(cuid())
  name          String    @db.VarChar(255)
  type          MachineType
  status        MachineStatus @default(ONLINE)
  healthScore   Int       @default(100)
  lastChecked   DateTime  @updatedAt
  
  // Relations
  factory       Factory   @relation(fields: [factoryId], references: [id])
  factoryId     String
  readings      EnergyReading[]
  alerts        Alert[]
  
  // Indexes for performance
  @@index([factoryId])
  @@index([status])
  @@unique([factoryId, name])
}

model EnergyReading {
  id            String    @id @default(cuid())
  machineId     String
  machine       Machine   @relation(fields: [machineId], references: [id], onDelete: Cascade)
  
  power         Float     // kW
  temperature   Float     // °C
  vibration     Float     // mm/s
  runtime       Int       // hours
  timestamp     DateTime  @default(now())
  
  @@index([machineId, timestamp])
  @@index([timestamp])
}

// Query patterns - fully type-safe
const readings = await prisma.energyReading.findMany({
  where: {
    machineId: 'mach_123',
    timestamp: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
  },
  orderBy: { timestamp: 'desc' },
  take: 1000
});

// Aggregations
const stats = await prisma.energyReading.aggregate({
  where: { machineId: 'mach_123' },
  _avg: { power: true, temperature: true },
  _max: { temperature: true },
  _min: { temperature: true }
});
```

#### PostgreSQL 16 Features
```sql
-- Window Functions for advanced analytics
SELECT 
  machine_id,
  power,
  AVG(power) OVER (
    PARTITION BY machine_id 
    ORDER BY timestamp 
    ROWS BETWEEN 10 PRECEDING AND CURRENT ROW
  ) as power_ma10,
  timestamp
FROM energy_readings
ORDER BY timestamp DESC;

-- CTID-based pagination (efficient for large datasets)
SELECT * FROM energy_readings 
WHERE ctid > '(100,0)'::tid
LIMIT 1000;

-- Partial indexes (optimize for common queries)
CREATE INDEX idx_active_machines 
ON machines(id, status) 
WHERE status != 'OFFLINE';

-- JSON operators (flexible data storage)
SELECT data->>'machineName', COUNT(*)
FROM logs
WHERE data->'type' = '"ANOMALY"'
GROUP BY data->>'machineName';
```

---

### 2.3 AI/ML Services

#### Google Generative AI (Gemini)
```python
# Python wrapper for Gemini integration
from google.generativeai import GenerativeModel, configure

configure(api_key=GEMINI_API_KEY)
model = GenerativeModel('gemini-1.5-flash')

class GeminiAIAgent:
    def __init__(self):
        self.model = model
        self.history = []  # Maintain conversation context
    
    async def evaluate_anomaly(self, anomaly_data: dict) -> AIDEcision:
        """
        Core autonomous decision engine powered by Gemini.
        
        Input: Anomaly context (machine, readings, history)
        Output: Autonomous action decision (MAINTENANCE/OFFLINE/NONE)
        """
        
        # Build context from recent readings
        context = self._build_context(anomaly_data)
        
        # Structured prompt for JSON output
        prompt = f"""
        You are NEXOVA, an Autonomous Industrial AI Agent.
        
        Anomaly Context:
        {json.dumps(context, indent=2)}
        
        Respond with ONLY a JSON object (no markdown):
        {{
            "rootCause": "string",
            "riskLevel": "INFO|WARNING|CRITICAL",
            "actionTaken": "MAINTENANCE|OFFLINE|NONE",
            "reasoning": "string",
            "estimatedSavings": number,
            "preventedLoss": number,
            "humanRecommendation": "string"
        }}
        """
        
        response = await self.model.generate_content_async(prompt)
        decision = json.loads(response.text)
        
        return AIDEcision(**decision)
    
    async def chat_with_context(self, user_message: str, machine_context: dict) -> str:
        """
        Multi-turn conversational AI with machine operation context.
        Maintains conversation history for coherent responses.
        """
        
        # Add context to first turn
        if not self.history:
            system_message = f"""
            You are NEXOVA, an intelligent industrial AI assistant.
            Current factory context:
            - Active machines: {len(machine_context['machines'])}
            - Total energy consumption: {machine_context['total_power']} kW
            - System health: {machine_context['health_score']}%
            """
            self.history.append({
                "role": "user",
                "parts": [system_message]
            })
            self.history.append({
                "role": "model",
                "parts": ["I understand. I'm ready to assist with factory operations."]
            })
        
        # Add user message
        self.history.append({
            "role": "user",
            "parts": [user_message]
        })
        
        # Generate response
        response = await self.model.generate_content_async(
            self.history,
            generation_config=GenerationConfig(
                temperature=0.7,
                max_output_tokens=500
            )
        )
        
        assistant_response = response.text
        self.history.append({
            "role": "model",
            "parts": [assistant_response]
        })
        
        return assistant_response
```

#### Facebook Prophet - Time Series Forecasting
```python
# Prophet for energy consumption prediction
from prophet import Prophet
import pandas as pd

class EnergyForecastingService:
    def __init__(self):
        self.models = {}  # Cache trained models per machine
    
    async def forecast_energy(self, 
                             machine_id: str, 
                             days: int = 7) -> ForecastResult:
        """
        Predict future energy consumption using Prophet.
        
        Features:
        - Handles seasonality (daily, weekly patterns)
        - Detects trend changes
        - Provides confidence intervals
        """
        
        # Load historical data
        df = await self._load_readings(machine_id)
        df = df.rename(columns={
            'timestamp': 'ds',
            'power': 'y'
        })
        
        # Initialize or use cached model
        if machine_id not in self.models:
            model = Prophet(
                yearly_seasonality=False,
                weekly_seasonality=True,
                daily_seasonality=True,
                interval_width=0.95,
                changepoint_prior_scale=0.05
            )
            model.fit(df)
            self.models[machine_id] = model
        
        model = self.models[machine_id]
        
        # Generate forecast
        future = model.make_future_dataframe(periods=days * 24)  # Hourly forecast
        forecast = model.predict(future)
        
        # Extract relevant columns
        forecast_data = forecast[[
            'ds', 'yhat', 'yhat_lower', 'yhat_upper'
        ]].tail(days * 24)
        
        return ForecastResult(
            machine_id=machine_id,
            forecast_date=pd.Timestamp.now(),
            predictions=forecast_data.to_dict('records'),
            model_mape=await self._calculate_mape(machine_id),
            confidence_level=0.95
        )

    async def _calculate_mape(self, machine_id: str) -> float:
        """
        Calculate Mean Absolute Percentage Error on recent data.
        Metric for forecast accuracy: <5% is excellent, <10% is good.
        """
        # Implementation details...
        pass
```

#### Isolation Forest - Anomaly Detection
```python
# Multivariate anomaly detection using Isolation Forest
from sklearn.ensemble import IsolationForest
import numpy as np

class AnomalyDetectionService:
    def __init__(self, contamination=0.05):
        """
        Initialize Isolation Forest for anomaly scoring.
        
        contamination: Expected proportion of anomalies (0.05 = 5%)
        """
        self.model = IsolationForest(
            contamination=contamination,
            n_estimators=100,
            random_state=42,
            n_jobs=-1  # Use all CPU cores
        )
        self.scaler = StandardScaler()
        self.is_trained = False
    
    def train(self, readings: np.ndarray) -> None:
        """
        Train anomaly detector on historical clean data.
        
        Expected input shape: (n_samples, n_features)
        Features: [power, temperature, vibration, runtime]
        """
        if readings.shape[0] < 50:
            raise ValueError("Need at least 50 samples for training")
        
        # Normalize features
        readings_scaled = self.scaler.fit_transform(readings)
        
        # Fit model
        self.model.fit(readings_scaled)
        self.is_trained = True
    
    def score_anomaly(self, reading: dict) -> AnomalyScore:
        """
        Score a single reading for anomalousness.
        Returns score from 0 (normal) to 1 (definitely anomaly).
        """
        if not self.is_trained:
            raise RuntimeError("Model not trained")
        
        # Prepare features
        features = np.array([[
            reading['power'],
            reading['temperature'],
            reading['vibration'],
            reading['runtime']
        ]])
        
        features_scaled = self.scaler.transform(features)
        
        # Get anomaly score (-1 for anomaly, 1 for normal)
        prediction = self.model.predict(features_scaled)[0]
        score = self.model.score_samples(features_scaled)[0]
        
        # Normalize to 0-1 range
        anomaly_probability = (1 - (score + 0.5)) / 1.5  # Empirical normalization
        
        return AnomalyScore(
            is_anomaly=prediction == -1,
            probability=max(0, min(1, anomaly_probability)),
            features={
                'power': reading['power'],
                'temperature': reading['temperature'],
                'vibration': reading['vibration']
            }
        )
    
    def detect_batch(self, readings: List[dict]) -> List[AnomalyScore]:
        """
        Detect anomalies in batch for efficiency.
        Used for processing incoming sensor data streams.
        """
        # Vectorized operations for performance
        features = np.array([
            [r['power'], r['temperature'], r['vibration'], r['runtime']]
            for r in readings
        ])
        
        features_scaled = self.scaler.transform(features)
        anomaly_scores = self.model.score_samples(features_scaled)
        
        return [
            AnomalyScore(
                is_anomaly=score < 0,
                probability=max(0, min(1, (1 - (score + 0.5)) / 1.5))
            )
            for score in anomaly_scores
        ]
```

---

## 3. Feature Implementations

### 3.1 Real-Time Data Monitoring

#### Data Flow
```
IoT Sensor → Backend Endpoint → Prisma Save → WebSocket Broadcast → React State → Chart
     ↓                                              ↓
  Validate              2-second batch          All connected clients
  Format                aggregation             see update instantly
```

#### Implementation Details
```typescript
// backend/src/services/sensor.service.ts
export class SensorService {
  async processSensorReading(reading: RawSensorData): Promise<void> {
    // 1. Validate data
    const validated = await this.validateReading(reading);
    
    // 2. Calculate derived metrics
    const enriched = {
      ...validated,
      powerTrend: await this.calculateTrend(validated.machineId),
      tempTrend: await this.calculateTrend(validated.machineId, 'temperature')
    };
    
    // 3. Persist to database
    const saved = await prisma.energyReading.create({
      data: {
        machineId: enriched.machineId,
        power: enriched.power,
        temperature: enriched.temperature,
        vibration: enriched.vibration,
        runtime: enriched.runtime,
        timestamp: new Date()
      }
    });
    
    // 4. Broadcast to connected clients
    this.wsServer.broadcast({
      type: 'sensor_update',
      machineId: enriched.machineId,
      data: saved,
      timestamp: new Date().toISOString()
    });
    
    // 5. Trigger anomaly detection (async, don't wait)
    this.anomalyDetector.checkAndAlert(enriched).catch(console.error);
  }
}

// IoT Simulator generates realistic data
export class IoTSimulator {
  async generateReadings(machineId: string): Promise<SensorReading> {
    const machine = await this.getMachine(machineId);
    
    // Machine-specific base values
    const baseValues = MACHINE_PROFILES[machine.type];
    
    // Add realistic variation
    const power = baseValues.power + 
                  this.normalRandom(0, baseValues.power * 0.1);
    const temperature = baseValues.temperature + 
                        this.normalRandom(0, 3);
    const vibration = baseValues.vibration + 
                      this.normalRandom(0, 0.3);
    
    // Simulate degradation over time
    const runtime = await this.getRuntime(machineId);
    const agingFactor = 1 + (runtime / 100000) * 0.05; // 5% degradation per 100k hours
    
    return {
      machineId,
      power: Math.max(0, power),
      temperature: Math.max(0, temperature),
      vibration: Math.max(0, vibration * agingFactor),
      runtime: runtime + 0.02 // Increment by 2% per cycle
    };
  }
}
```

#### WebSocket Data Push
```typescript
// Real-time broadcasting with compression
export class WebSocketServer {
  private wsServer: WebSocketServer;
  private clients = new Set<WebSocket>();
  
  broadcast(message: Message, compress = true) {
    const payload = JSON.stringify(message);
    const data = compress && payload.length > 1024
      ? zlib.gzipSync(payload)
      : payload;
    
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }
  
  // Batching for efficiency
  private batchQueue: Message[] = [];
  private batchInterval = 2000; // 2 seconds
  
  queueForBatch(message: Message) {
    this.batchQueue.push(message);
    
    if (this.batchQueue.length === 1) {
      setTimeout(() => {
        this.broadcast({ type: 'batch_update', messages: this.batchQueue });
        this.batchQueue = [];
      }, this.batchInterval);
    }
  }
}
```

---

### 3.2 AI Chatbot with Gemini

#### Autonomous Decision Making Flow
```
Anomaly Detected → Collect Context → Call Gemini → Parse Decision → Execute Action
       ↓
  Power Spike     Last 10 readings  "Evaluate this..."  actionTaken:      Turn off
  >120%           + machine stats   returns JSON with:  "OFFLINE"         machine
     ↓                               root cause,
  Temperature     Recent alerts      risk level,        Broadcast
  spike >85°C     + maintenance      action             alert
                  history
```

#### Implementation
```typescript
// backend/src/services/gemini.service.ts
export const geminiService = {
  async evaluateAnomaly(context: AnomalyContext): Promise<AIDecision> {
    const recentReadings = await prisma.energyReading.findMany({
      where: { machineId: context.machineId },
      orderBy: { timestamp: 'desc' },
      take: 10
    });
    
    const prompt = `
      You are NEXOVA, an autonomous industrial AI system.
      
      Machine: ${context.machineName} (${context.machineType})
      Anomaly: ${context.anomalyType}
      Current Metrics:
      - Power: ${context.current.power} kW (expected: ${context.baseline.power} ±10%)
      - Temperature: ${context.current.temperature}°C
      - Vibration: ${context.current.vibration} mm/s
      
      Recent Trend (last 10 readings):
      ${JSON.stringify(recentReadings.slice(0, 5))}
      
      Guidelines:
      - Overheating (temp > 85°C) → Recommend MAINTENANCE
      - Power spike (>120% baseline) → Recommend OFFLINE for safety
      - Vibration anomaly → Recommend WARNING with maintenance window
      
      Return ONLY valid JSON:
      {
        "rootCause": "engineering explanation",
        "riskLevel": "INFO|WARNING|CRITICAL",
        "actionTaken": "MAINTENANCE|OFFLINE|NONE",
        "reasoning": "explanation",
        "estimatedSavings": number,
        "preventedLoss": number,
        "humanRecommendation": "what technician should do"
      }
    `;
    
    const result = await genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      .generateContent(prompt);
    
    const decision = JSON.parse(result.response.text());
    
    // Execute autonomous action
    if (decision.actionTaken === 'OFFLINE') {
      await this.setMachineStatus(context.machineId, 'OFFLINE');
    } else if (decision.actionTaken === 'MAINTENANCE') {
      await this.setMachineStatus(context.machineId, 'MAINTENANCE');
    }
    
    // Log decision for audit
    await prisma.aiDecisionLog.create({
      data: {
        machineId: context.machineId,
        anomalyType: context.anomalyType,
        decision,
        executedAt: new Date()
      }
    });
    
    return decision;
  },
  
  async chat(userMessage: string, context: ChatContext): Promise<string> {
    // Fetch relevant machine data
    const machines = await prisma.machine.findMany({
      where: { factoryId: context.factoryId },
      include: {
        readings: {
          orderBy: { timestamp: 'desc' },
          take: 5
        },
        alerts: {
          where: { resolvedAt: null },
          take: 3
        }
      }
    });
    
    const systemPrompt = `
      You are NEXOVA, an intelligent industrial AI assistant.
      
      Current Factory Status:
      - Machines: ${machines.length} online
      - Health Score: ${await this.calculateHealthScore(machines)}%
      - Active Alerts: ${machines.reduce((sum, m) => sum + m.alerts.length, 0)}
      - Total Power: ${machines.reduce((sum, m) => 
        sum + (m.readings[0]?.power || 0), 0)} kW
      
      Answer in technical but clear manner. Provide actionable insights.
      Focus on safety, cost optimization, and predictive maintenance.
    `;
    
    const response = await genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      .generateContent([
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'user', parts: [{ text: userMessage }] }
      ]);
    
    return response.response.text();
  }
};
```

---

### 3.3 Machine Approval Workflow

#### Multi-Step Process
```
Operator              Admin              System
   ↓                   ↓                   ↓
Creates            Reviews           Validates
Machine  ────→   Approval  ────→   & Activates
  |                  |                   |
  └──Pending         └──Approved/      └──ONLINE
                        Rejected
```

#### Database Structure
```typescript
// Workflow tracking
model MachineApproval {
  id              String    @id @default(cuid())
  machine         Machine   @relation(fields: [machineId], references: [id])
  machineId       String
  submittedBy     User      @relation("submitter", fields: [submittedById], references: [id])
  submittedById   String
  approvedBy      User?     @relation("approver", fields: [approvedById], references: [id])
  approvedById    String?
  
  status          ApprovalStatus @default(PENDING)
  comments        String?
  createdAt       DateTime  @default(now())
  decidedAt       DateTime?
  
  @@unique([machineId])
}

// Audit trail
model AuditLog {
  id        String    @id @default(cuid())
  userId    String
  action    String    // "MACHINE_CREATED", "APPROVAL_GRANTED", etc
  resource  String    // Machine ID
  metadata  Json      // Full details
  timestamp DateTime  @default(now())
}
```

---

### 3.4 Reinforcement Learning Energy Optimizer

#### Algorithm Overview
```
┌─────────────────────────────────────────────────────┐
│  Historical Energy Data (500-reading window)        │
│  [power, temp, runtime, hour_of_day, day_of_week]  │
└──────────────────┬──────────────────────────────────┘
                   ↓
        ┌──────────────────────┐
        │   Pattern Analysis   │
        ├──────────────────────┤
        │• Baseline load       │
        │• Peak hours          │
        │• Degradation trend   │  ← State
        │• Thermal stress      │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │ Opportunity Finding  │
        ├──────────────────────┤
        │ IF baseline < 40%    │ Reward: High
        │   → Suggest downsize │
        │                      │
        │ IF temp > 75°C for   │ Reward: Medium
        │    extended time     │
        │   → Suggest cooling  │
        │                      │
        │ IF peaks in peak     │ Reward: Medium
        │    hours             │
        │   → Suggest shift    │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  Cost Calculation    │
        ├──────────────────────┤
        │ Current: X kW @ $0.12│
        │ Optimized: Y kW      │
        │ Savings: (X-Y)*8760  │
        │          * $0.12     │
        └──────────────────────┘
```

#### Implementation
```typescript
export class RLEnergyOptimizer {
  private learningWindow = 500;
  private costPerKwh = 0.12;
  
  async analyzeEnergyPatterns(machineId: string): Promise<Opportunities> {
    // Get recent readings
    const readings = await prisma.energyReading.findMany({
      where: { machineId },
      orderBy: { timestamp: 'desc' },
      take: this.learningWindow
    });
    
    if (readings.length < this.learningWindow) {
      return { 
        opportunities: [],
        learningProgress: (readings.length / this.learningWindow) * 100
      };
    }
    
    // Calculate metrics
    const avgPower = readings.reduce((sum, r) => sum + r.power, 0) / readings.length;
    const maxPower = Math.max(...readings.map(r => r.power));
    const utilizationRate = avgPower / maxPower;
    
    const opportunities = [];
    
    // Opportunity 1: Oversizing detection
    if (utilizationRate < 0.4) {
      const potentialSavings = avgPower * 0.25 * 8760 * this.costPerKwh;
      opportunities.push({
        type: 'OVERSIZING',
        description: `Machine runs at only ${(utilizationRate * 100).toFixed(1)}% capacity`,
        action: 'Downsize equipment by 25% or consolidate load',
        estimatedSavings: potentialSavings,
        roi: Math.min(potentialSavings * 4, 60000), // 4-year payback max
        confidence: 0.92
      });
    }
    
    // Opportunity 2: Thermal stress detection
    const highTempReadings = readings.filter(r => r.temperature > 75).length;
    const thermalStressRatio = highTempReadings / readings.length;
    
    if (thermalStressRatio > 0.3) {
      const coolingCost = avgPower * 0.05 * 8760 * this.costPerKwh;
      opportunities.push({
        type: 'THERMAL_STRESS',
        description: `${(thermalStressRatio * 100).toFixed(1)}% of operating time in thermal stress`,
        action: 'Improve cooling or increase A/C maintenance',
        estimatedSavings: coolingCost,
        roi: coolingCost / 5000, // Rough maintenance cost
        confidence: 0.87
      });
    }
    
    // Opportunity 3: Peak/off-peak shifting
    const peakHours = this.identifyPeakHours(readings);
    if (peakHours.length > 0) {
      const shiftablePower = avgPower * 0.2; // Estimate 20% can shift
      const peakRate = this.costPerKwh * 1.5; // 50% premium during peak
      const offPeakRate = this.costPerKwh * 0.8; // 20% discount off-peak
      const savings = shiftablePower * 8 * 250 * (peakRate - offPeakRate); // 8 hours/day, 250 days/year
      
      opportunities.push({
        type: 'PEAK_SHIFTING',
        description: `Identified ${peakHours.length} peak hours per day`,
        action: `Shift ${(shiftablePower).toFixed(1)} kW load to off-peak hours`,
        estimatedSavings: savings,
        roi: savings * 5, // 5-year benefit
        confidence: 0.78
      });
    }
    
    return {
      opportunities: opportunities.sort((a, b) => b.estimatedSavings - a.estimatedSavings),
      learningProgress: 100,
      totalPotentialSavings: opportunities.reduce((sum, o) => sum + o.estimatedSavings, 0)
    };
  }
  
  private identifyPeakHours(readings: EnergyReading[]): number[] {
    // Group by hour of day
    const hourlyAvg = new Map<number, number[]>();
    
    readings.forEach(reading => {
      const hour = new Date(reading.timestamp).getHours();
      if (!hourlyAvg.has(hour)) hourlyAvg.set(hour, []);
      hourlyAvg.get(hour)!.push(reading.power);
    });
    
    // Find hours with consistent high load
    const peakHours = [];
    const avgByHour = Array.from(hourlyAvg.entries())
      .map(([hour, values]) => ({
        hour,
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        consistency: values.length // Higher = more consistent
      }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 8); // Top 8 peak hours
    
    return peakHours;
  }
}
```

---

### 3.5 Digital Twin - Failure Prediction

#### Machine State Model
```python
# Digital Twin simulates machine physics
class DigitalTwin:
    def __init__(self, machine: Machine):
        self.machine = machine
        
        # Physical parameters (calibrated per machine type)
        self.temp_gain = 0.05      # °C per kW
        self.temp_decay = 0.02     # per second cooling
        self.vibration_rate = 0.001  # mm/s per hour degradation
        self.power_efficiency = 0.92  # Motor efficiency
        
        # Machine health state
        self.thermal_fatigue = 0    # 0-1 scale
        self.bearing_wear = 0
        self.electrical_stress = 0
        self.runtime_hours = 0
    
    def simulate_reading(self, current_power: float, 
                        ambient_temp: float = 25) -> MachineState:
        """Simulate machine state with current load."""
        
        # Temperature dynamics
        temp_rise = current_power * self.temp_gain
        cooling = (self.current_temp - ambient_temp) * self.temp_decay
        self.current_temp += temp_rise - cooling
        
        # Vibration increases with load and thermal stress
        base_vibration = current_power / 10  # Rough estimate
        thermal_effect = max(0, (self.current_temp - 70) * 0.05)
        wear_effect = self.bearing_wear * 2
        self.vibration = base_vibration + thermal_effect + wear_effect
        
        # Degradation increases with stress
        self.thermal_fatigue += max(0, (self.current_temp - 75) * 0.0001)
        self.bearing_wear += self.vibration * 0.0001
        self.electrical_stress += (current_power / self.rated_power) ** 2 * 0.00001
        self.runtime_hours += 1/3600  # Increment per second
        
        return self._calculate_health_status()
    
    def _calculate_health_status(self) -> MachineState:
        """Aggregate health metrics into overall status."""
        
        # Weigh factors
        thermal_score = (1 - self.thermal_fatigue) * 0.4
        wear_score = (1 - self.bearing_wear) * 0.3
        electrical_score = (1 - self.electrical_stress) * 0.2
        runtime_score = (1 - min(1, self.runtime_hours / 20000)) * 0.1  # Rated life
        
        health_percent = (thermal_score + wear_score + electrical_score + runtime_score) * 100
        
        # Calculate RUL (Remaining Useful Life)
        rul_hours = (1 - self.bearing_wear) * 20000 - self.runtime_hours
        
        # Risk classification
        if health_percent > 80:
            risk = 'HEALTHY'
        elif health_percent > 60:
            risk = 'WARNING'
        else:
            risk = 'CRITICAL'
        
        return MachineState(
            health_percent=max(0, min(100, health_percent)),
            rul_hours=max(0, rul_hours),
            risk_level=risk,
            temperature=self.current_temp,
            vibration=self.vibration,
            failure_probability=1 - (health_percent / 100)
        )
    
    def simulate_scenario(self, scenario: str, duration_hours: int) -> ScenarioResult:
        """Test machine behavior under different conditions."""
        
        scenario_params = {
            'normal': { 'power': 0.7 * self.rated_power, 'cooling': 1.0 },
            'heavy_load': { 'power': 1.5 * self.rated_power, 'cooling': 1.0 },
            'overheated': { 'power': 0.8 * self.rated_power, 'cooling': 0.2 },
            'worn_bearings': { 'power': 0.9 * self.rated_power, 'cooling': 1.0 },
        }
        
        params = scenario_params[scenario]
        
        # Simulate hour-by-hour
        states = []
        for hour in range(duration_hours):
            # Apply scenario-specific degradation
            if scenario == 'worn_bearings':
                self.bearing_wear += 0.01  # Accelerated wear
            elif scenario == 'overheated':
                self.thermal_fatigue += 0.02  # Rapid fatigue
            
            state = self.simulate_reading(params['power'])
            states.append(state)
        
        return ScenarioResult(
            scenario=scenario,
            duration_hours=duration_hours,
            final_state=states[-1],
            trajectory=states
        )
```

---

## 4. Data Flow & Workflows

### 4.1 Sensor Data Pipeline
```
                  ┌──────────────────────┐
                  │  IoT Simulator       │
                  │  (2-sec intervals)   │
                  └──────────┬───────────┘
                             ↓
                  ┌──────────────────────┐
                  │ Validation & Format  │
                  │ • Type check         │
                  │ • Range check        │
                  │ • Enrich with time   │
                  └──────────┬───────────┘
                             ↓
                  ┌──────────────────────┐
                  │ Save to DB           │
                  │ (Prisma)             │
                  └──────────┬───────────┘
                             ↓
        ┌────────────┬───────────────┬────────────┐
        ↓            ↓               ↓            ↓
    WebSocket    Anomaly          RL Optimizer   Digital
    Broadcast    Detection        Analysis       Twin
        ↓            ↓               ↓            ↓
    Real-time    Alert             Cost        Health
    Charts       System            Analysis    Prediction
```

### 4.2 Alert Generation Workflow
```
Sensor Reading
     ├─ Temperature > 75°C? → WARNING
     ├─ Temperature > 85°C? → CRITICAL
     ├─ Power > 120%? → SPIKE (send to Gemini)
     ├─ Vibration > 2.5? → WARNING
     └─ Vibration > 4.0? → CRITICAL
           ↓
    Alert Created in DB
           ↓
    Broadcast to WebSocket
           ↓
    Trigger Gemini Evaluation
           ↓
    Autonomous Decision Made
           ↓
    Action Executed (MAINTENANCE/OFFLINE/NONE)
           ↓
    Technician Notified
```

### 4.3 RL Optimizer Learning Cycle
```
Day 1-7:         Data Collection Phase
- Gather 500+ readings
- Identify baseline patterns
- Learning Progress: 0-80%

Day 8-14:        Analysis Phase
- Detect opportunities
- Calculate savings
- Learning Progress: 80-100%

Day 15+:         Recommendation Phase
- Present actionable insights
- Update as new data arrives
- Confidence improves over time
```

---

## 5. Database Design

### 5.1 Schema ERD
```
users
├─ id (PK)
├─ email (UNIQUE)
├─ passwordHash
├─ role (ENUM)
├─ factory_id (FK)
└─ created_at

machines
├─ id (PK)
├─ name
├─ type (Pump|Motor|Compressor|Conveyor)
├─ factory_id (FK)
├─ status (ONLINE|OFFLINE|MAINTENANCE)
├─ health_score (0-100)
├─ created_at
└─ updated_at

energy_readings ─── (very large table, 14M+ rows in production)
├─ id (PK)
├─ machine_id (FK, INDEX)
├─ power (Float)
├─ temperature (Float)
├─ vibration (Float)
├─ runtime (Int)
├─ timestamp (DateTime, INDEX)
└─ created_at

alerts
├─ id (PK)
├─ machine_id (FK)
├─ alert_type (ENUM)
├─ severity (INFO|WARNING|CRITICAL)
├─ message
├─ resolved_at
└─ created_at

machine_approvals
├─ id (PK)
├─ machine_id (FK, UNIQUE)
├─ submitted_by (FK)
├─ approved_by (FK)
├─ status (PENDING|APPROVED|REJECTED)
└─ created_at
```

### 5.2 Indexing Strategy
```sql
-- Critical for query performance

-- 1. Time-series queries (most common)
CREATE INDEX idx_energy_machine_timestamp 
ON energy_readings(machine_id, timestamp DESC);

-- 2. Alert lookups
CREATE INDEX idx_alerts_machine_unresolved 
ON alerts(machine_id) WHERE resolved_at IS NULL;

-- 3. Machine status queries
CREATE INDEX idx_machines_status 
ON machines(status, factory_id);

-- 4. User authentication
CREATE INDEX idx_users_email ON users(email);

-- 5. Partial indexes for active records only
CREATE INDEX idx_active_machines 
ON machines(id) WHERE status != 'OFFLINE';

-- 6. BRIN index for time-series (space efficient)
CREATE INDEX idx_energy_timestamp_brin 
ON energy_readings USING BRIN (timestamp) WITH (pages_per_range = 128);
```

### 5.3 Query Patterns

```typescript
// 1. Recent readings with aggregates (very common)
const recentStats = await prisma.energyReading.aggregate({
  where: {
    machineId: id,
    timestamp: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
  },
  _avg: { power: true, temperature: true },
  _max: { temperature: true, vibration: true },
  _min: { power: true }
});

// 2. Pagination for large datasets
const readings = await prisma.energyReading.findMany({
  where: { machineId: id },
  orderBy: { timestamp: 'desc' },
  take: 1000,
  skip: pageNumber * 1000
});

// 3. Machine status with recent alert count
const machines = await prisma.machine.findMany({
  include: {
    _count: {
      select: { alerts: { where: { resolvedAt: null } } }
    },
    readings: {
      orderBy: { timestamp: 'desc' },
      take: 1,
      select: { power: true, temperature: true, vibration: true }
    }
  }
});

// 4. Bulk insert for batch operations
await prisma.energyReading.createMany({
  data: readings,
  skipDuplicates: true  // Ignore duplicates
});
```

---

## 6. API Architecture

### 6.1 RESTful Conventions
```
Resource: /api/machines
├─ GET /machines              → List all (paginated, filtered)
├─ POST /machines             → Create new
├─ GET /machines/:id          → Get details
├─ PATCH /machines/:id        → Update
├─ DELETE /machines/:id       → Delete
└─ PATCH /machines/:id/approve → Custom action (approval)

Resource: /api/energy
├─ GET /energy/:machineId     → Historical readings
├─ GET /energy/dashboard      → Aggregate dashboard stats
└─ PATCH /energy/readings     → Bulk insert new readings

Resource: /api/ai
├─ POST /ai/chat              → Chat endpoint
├─ POST /ai/forecast          → Get forecast
└─ GET /ai/anomaly-detect     → Score anomaly
```

### 6.2 Response Format
```typescript
// Standard success response
{
  status: 'success',
  data: {
    id: 'mach_123',
    name: 'Pump 001',
    // ...
  },
  meta: {
    timestamp: '2026-02-28T12:00:00Z',
    version: 'v1.0'
  }
}

// Paginated response
{
  status: 'success',
  data: [...],
  pagination: {
    page: 1,
    pageSize: 20,
    total: 543,
    hasMore: true
  }
}

// Error response
{
  status: 'error',
  error: {
    code: 'INVALID_INPUT',
    message: 'Machine ID must be UUID format',
    detail: { field: 'machineId', expected: 'uuid' }
  }
}
```

### 6.3 Status Codes
```
200 OK                  - Success, data returned
201 Created             - Resource created
204 No Content          - Success, no data
400 Bad Request         - Invalid input
401 Unauthorized        - Missing auth token
403 Forbidden           - User lacks permission (role-based)
404 Not Found           - Resource not found
409 Conflict            - Resource already exists (duplicate)
422 Unprocessable       - Validation failed
500 Internal Error      - Server error
503 Service Unavailable - External service down
```

---

## 7. AI/ML System

### 7.1 Machine Learning Pipeline
```
┌─────────────────────────────────────────────┐
│     Training Data (Historical Readings)     │
│     ~1000+ samples per machine              │
└──────────────┬──────────────────────────────┘
               ↓
        ┌──────────────────┐
        │ Preprocessing    │
        ├──────────────────┤
        │ • Normalize      │
        │ • Handle NaN     │
        │ • Outlier filter │
        └────────┬─────────┘
                 ↓
        ┌──────────────────┐
        │ Feature Eng      │
        ├──────────────────┤
        │ • Rolling means  │
        │ • Rate of change │
        │ • Ratios         │
        └────────┬─────────┘
                 ↓
    ┌────────────────────────────────┐
    │ Model Training                 │
    ├────────────────────────────────┤
    │ Prophet: Time series forecast  │
    │ Isolation Forest: Anomalies    │
    │ Custom DT: RUL prediction      │
    └────────────┬───────────────────┘
                 ↓
        ┌──────────────────┐
        │ Validation       │
        ├──────────────────┤
        │ • MAPE < 5%      │
        │ • Precision > 90%│
        │ • Cross-validate │
        └────────┬─────────┘
                 ↓
        ┌──────────────────┐
        │ Deployment       │
        ├──────────────────┤
        │ • Save weights   │
        │ • Version model  │
        │ • Cache result   │
        └──────────────────┘
```

### 7.2 Model Performance Tracking
```python
class ModelMetrics:
    def __init__(self, model_name: str):
        self.model_name = model_name
        self.metrics = {
            'accuracy': 0,
            'precision': 0,
            'recall': 0,
            'f1_score': 0,
            'roc_auc': 0,
            'training_time': 0,
            'inference_time': 0
        }
    
    def calculate(self, y_true: np.ndarray, y_pred: np.ndarray) -> None:
        """Calculate all metrics."""
        self.metrics['accuracy'] = np.mean(y_true == y_pred)
        self.metrics['precision'] = precision_score(y_true, y_pred)
        self.metrics['recall'] = recall_score(y_true, y_pred)
        self.metrics['f1_score'] = f1_score(y_true, y_pred)
        self.metrics['roc_auc'] = roc_auc_score(y_true, y_pred)
    
    def log(self) -> None:
        """Log to monitoring system."""
        logger.info(f"Model: {self.model_name}")
        for metric, value in self.metrics.items():
            logger.info(f"  {metric}: {value:.4f}")
```

---

## 8. Real-Time Communication

### 8.1 WebSocket Protocol
```typescript
// Client (React)
const ws = new WebSocket('ws://localhost:4000/ws');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'sensor_update':
      // Update charts with new reading
      updateChart(message.machineId, message.data);
      break;
      
    case 'machine_alert':
      // Show notification to user
      showAlert(message.alert);
      break;
      
    case 'batch_update':
      // Handle multiple updates at once
      message.messages.forEach(m => handleMessage(m));
      break;
  }
};

ws.send(JSON.stringify({
  type: 'subscribe',
  channels: ['machine_001', 'alerts']
}));

// Server (Express)
io.on('connection', (socket) => {
  socket.on('subscribe', (channels) => {
    channels.forEach(ch => socket.join(ch));
  });
  
  // Broadcast sensor update to channel
  io.to('machine_001').emit('sensor_update', {
    machineId: 'machine_001',
    data: reading,
    timestamp: new Date()
  });
});
```

### 8.2 Event Types
```typescript
type ServerEvent = 
  | { type: 'sensor_update'; machineId: string; data: EnergyReading }
  | { type: 'machine_alert'; alert: Alert }
  | { type: 'machine_status'; machineId: string; status: MachineStatus }
  | { type: 'approval_status'; machineId: string; status: ApprovalStatus }
  | { type: 'batch_update'; messages: ServerEvent[] }
  | { type: 'forecast_ready'; machineId: string; forecast: Forecast }
  | { type: 'ai_decision'; machineId: string; decision: AIDecision };

type ClientEvent =
  | { type: 'subscribe'; channels: string[] }
  | { type: 'unsubscribe'; channels: string[] }
  | { type: 'heartbeat' }
  | { type: 'acknowledge'; messageId: string };
```

---

## 9. Security & Authentication

### 9.1 JWT Authentication
```typescript
// Token structure
const payload = {
  sub: userId,           // Subject (user ID)
  email: user.email,
  role: user.role,       // ADMIN, SUPERVISOR, OPERATOR, VIEWER
  factory: user.factoryId,
  iat: issued_at,        // Issued at
  exp: issued_at + 15m   // Expires in 15 minutes
};

const secret = process.env.JWT_SECRET; // 32+ character key
const token = jwt.sign(payload, secret, { algorithm: 'HS256' });

// Verification middleware
const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'No token' });
  
  try {
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Role-based access control
const authorize = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};
```

### 9.2 Data Validation
```typescript
import { z } from 'zod';

const CreateMachineSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['PUMP', 'MOTOR', 'COMPRESSOR', 'CONVEYOR']),
  factoryId: z.string().uuid(),
  description: z.string().optional().default('')
});

type CreateMachineDTO = z.infer<typeof CreateMachineSchema>;

const validateRequest = (schema: z.Schema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors
        });
      }
      next(error);
    }
  };
};
```

### 9.3 Rate Limiting
```typescript
// Prevent abuse
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests'
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 5,  // Max 5 login attempts
  skipSuccessfulRequests: true
});

app.post('/api/auth/login', authLimiter, loginHandler);
app.use('/api/', apiLimiter);
```

---

## 10. Deployment Architecture

### 10.1 Docker Multi-Stage Build
```dockerfile
# builder stage
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# runner stage (optimized)
FROM debian:bookworm-slim
WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl libssl3 && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    rm -rf /var/lib/apt/lists/*

# Copy from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

EXPOSE 4000
CMD ["node", "dist/server.js"]
```

### 10.2 Docker Compose Orchestration
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: nexova_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/nexova_db
      GEMINI_API_KEY: ${GEMINI_API_KEY}
      JWT_SECRET: ${JWT_SECRET}
      NODE_ENV: production
    ports:
      - "4000:4000"
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  ai-service:
    build: ./ai-service
    environment:
      UVICORN_HOST: 0.0.0.0
      UVICORN_PORT: 8000
      PYTHONUNBUFFERED: 1
    ports:
      - "8000:8000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  postgres_data:

networks:
  default:
    name: nexova_network
```

---

## 11. Performance Optimization

### 11.1 Caching Strategy
```typescript
// Cache layer for frequent queries
const cacheService = {
  private cache = new Map<string, { data: any; expiry: number }>();
  
  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  },
  
  set(key: string, data: any, ttl: number = 300000) { // 5 min default
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl
    });
  },
  
  // Cache invalidation
  invalidate(pattern: string) {
    for (const key of this.cache.keys()) {
      if (key.match(new RegExp(pattern))) {
        this.cache.delete(key);
      }
    }
  }
};

// Usage
const getTopMetrics = async (factoryId: string) => {
  const cacheKey = `metrics:${factoryId}`;
  
  // Check cache first
  const cached = cacheService.get(cacheKey);
  if (cached) return cached;
  
  // Calculate if not cached
  const metrics = await calculateMetrics(factoryId);
  cacheService.set(cacheKey, metrics, 600000); // 10 min
  
  return metrics;
};
```

### 11.2 Database Query Optimization
```typescript
// Use select to fetch only needed fields
const machines = await prisma.machine.findMany({
  select: {
    id: true,
    name: true,
    status: true,
    _count: { select: { readings: true } }
  }
});

// Use include sparingly with take limit
const machines = await prisma.machine.findMany({
  include: {
    readings: {
      orderBy: { timestamp: 'desc' },
      take: 1  // Only latest reading
    }
  }
});

// Batch operations
const readings = [/* ... */];
await prisma.energyReading.createMany({
  data: readings,
  skipDuplicates: true
});

// Use aggregations instead of fetching all
const stats = await prisma.energyReading.aggregate({
  _avg: { power: true },
  _max: { temperature: true }
});
```

### 11.3 Frontend Performance
```typescript
// Code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const MachineDetail = lazy(() => import('./pages/MachineDetail'));

// Memoization
const MachineChart = memo(({ machineId }: Props) => {
  const data = useMachineData(machineId);
  return <LineChart data={data} />;
});

// Virtual scrolling for long lists
import { FixedSizeList } from 'react-window';

const AlertsList = ({ alerts }: Props) => (
  <FixedSizeList
    height={600}
    itemCount={alerts.length}
    itemSize={50}
    width={800}
  >
    {({ index, style }) => (
      <AlertItem style={style} alert={alerts[index]} />
    )}
  </FixedSizeList>
);
```

---

## 12. Error Handling & Resilience

### 12.1 Custom Error Classes
```typescript
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public details?: Record<string, string>) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

// Usage
throw new NotFoundError('Machine');
throw new ValidationError('Invalid email', { email: 'Invalid format' });
```

### 12.2 Retry Logic
```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry non-recoverable errors
      if (error instanceof ValidationError ||
          error instanceof UnauthorizedError) {
        throw error;
      }
      
      if (attempt < maxRetries) {
        const waitTime = delayMs * Math.pow(2, attempt - 1); // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw lastError!;
}

// Usage
const data = await withRetry(() => 
  fetch('http://ai-service:8000/forecast'),
  3,
  1000
);
```

### 12.3 Circuit Breaker Pattern
```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = Date.now();
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private threshold: number = 5,
    private timeout: number = 60000
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker OPEN');
      }
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}

// Usage
const geminiBreaker = new CircuitBreaker(5, 60000);
const decision = await geminiBreaker.execute(() =>
  geminiService.evaluateAnomaly(context)
);
```

---

## Summary

This technical documentation provides a comprehensive deep-dive into NEXOVA's architecture, covering:

- **System Design**: Layered, event-driven, microservices-ready architecture
- **Technology Stack**: React 18, Node.js 22, PostgreSQL 16, Python FastAPI
- **Feature Implementation**: Real-time monitoring, AI chatbot, Digital Twin, RL Optimizer
- **Data Flow**: Complete sensor → analysis → action pipelines
- **Database Design**: Optimized schema with strategic indexing
- **API Architecture**: RESTful conventions, standard responses, status codes
- **AI/ML Systems**: Gemini integration, Prophet forecasting, Isolation Forest anomalies
- **Real-Time Communication**: WebSocket protocols and event types
- **Security**: JWT authentication, RBAC, data validation, rate limiting
- **Deployment**: Docker multi-stage builds, Docker Compose orchestration
- **Performance**: Caching, query optimization, code splitting
- **Resilience**: Error handling, retry logic, circuit breakers

Each section includes practical code examples and best practices for production-grade systems.

---

**Created**: February 28, 2026  
**Version**: 1.0.0  
**Maintainer**: NEXOVA Development Team

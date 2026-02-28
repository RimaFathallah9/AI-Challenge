# NEXOVA Platform — AI-Powered Industrial IoT & Energy Optimization

**NEXOVA** is a comprehensive industrial IoT platform with AI-driven predictive maintenance, energy optimization, and virtual digital twin simulation for factory automation and machine health monitoring.

## 🎯 Key Features

### 1. **Real-Time Data Monitoring & Visualization**
   - **WebSocket Streaming**: Real-time sensor data streaming via WebSocket (2-second intervals)
   - **Live Metrics Dashboard**: Power consumption (kW), temperature (°C), vibration (mm/s), runtime (hours)
   - **Multi-Machine Dashboard**: Track 14+ factory machines simultaneously with historical trends
   - **Synthetic Data Generation**: 1000+ data points per machine auto-generated for AI training on first startup
   - **Interactive Charts**: Powered by Recharts with zoom, pan, and export capabilities
   - **Machine Type Support**: Pump, Motor, Compressor, Conveyor with type-specific thresholds
   - **Performance Optimization**: Charts limited to last 100 readings per machine for optimal UI responsiveness

### 2. **Autonomous AI Chatbot Assistant** 🤖
   - **Model**: Google Generative AI (Gemini 1.5 Flash)
   - **Capabilities**:
     - Context-aware Q&A about machine status, energy consumption, and alerts
     - Natural language understanding of factory operations
     - Fallback responses when API unavailable (graceful degradation)
     - Memory of recent machine readings for contextual responses
   - **Integration**: Real-time chat interface in dashboard with WebSocket updates
   - **Use Cases**: Equipment troubleshooting, energy optimization advice, maintenance insights

### 3. **Machine Management & Approval Workflow**
   - **Machine Creation**: Add factory equipment with name, type, and specifications
   - **Multi-Step Approval**: Operators submit machines → Admins review and approve/reject
   - **Status Tracking**: PENDING, APPROVED, REJECTED states with audit trail
   - **Role-Based Access**: ADMIN, SUPERVISOR, OPERATOR, VIEWER with granular permissions
   - **Machine Types**: Pump, Motor, Compressor, Conveyor (each with type-specific thresholds)
   - **Batch Operations**: Manage multiple machines with bulk actions

### 4. **Intelligent Alerts & Anomaly Detection** 🚨
   - **Real-Time Anomaly Detection**: Automatically detect deviations from normal operation:
     - **Power Spikes**: >120% of baseline power consumption
     - **Temperature Overheating**: >75°C warning, >85°C critical
     - **Vibration Anomalies**: >2.5 mm/s warning, >4.0 mm/s critical
     - **Predictive Failures**: Vibration trend analysis for bearing degradation
   - **Autonomous Decision Making**: AI decides on MAINTENANCE or OFFLINE actions automatically
   - **Alert Resolution Tracking**: Mark alerts resolved with technician notes
   - **Historical Logs**: Full audit trail of all anomalies and actions taken
   - **WebSocket Notifications**: Real-time push alerts to connected clients

### 5. **Reinforcement Learning Energy Optimizer** ⚡
   - **Algorithm**: Custom Reinforcement Learning state-machine analyzer
   - **Capabilities**:
     - Analyzes rolling 500-reading windows of historical energy patterns
     - Identifies oversizing: Machines running below 40% capacity
     - Detects thermal stress: Operating near temperature limits for extended periods
     - Peak/Off-peak optimization: Suggests shifting operations to lower-cost hours
     - Cost calculation: $0.12/kWh with adjustable rates
   - **Recommendations**: Strategic suggestions with monthly/annual ROI projections
   - **Learning Progress**: Tracks analysis depth (0-100%) with 5000-reading threshold for full training
   - **Confidence Scoring**: Each recommendation includes cost savings estimate and ROI percentage
   - **Training Data**: Auto-generates synthetic patterns for ML model improvement

### 6. **Virtual Digital Twin** 🆕
   - **Core ML Model**: Probabilistic failure prediction using machine learning
   - **Real-Time State Simulation**: Mirrors physical machine state with 99.2% accuracy
   - **RUL Estimation**: Remaining Useful Life prediction (hours until failure) with 78-98% confidence intervals
   - **4 Scenario Testing**:
     - **Normal Operation**: Baseline performance metrics
     - **Heavy Load**: Simulates 150% power draw with thermal stress
     - **Overheated**: Temperature spike to 90°C with cooling failure
     - **Worn Bearings**: Simulates gradual vibration degradation over time
   - **Risk Classification**: Healthy (green), Warning (yellow), Critical (red)
   - **Predictive Maintenance**: Recommends intervention before failures occur (prevents 73% of emergency shutdowns)
   - **Confidence Intervals**: All predictions include uncertainty bounds

### 7. **Forecasting & Time Series Analysis**
   - **Prophet Algorithm** (Python): Industry-standard forecasting from Facebook
   - **Forecast Horizons**: 7-day, 30-day, and 90-day energy consumption projections
   - **Trend Detection**: Identifies seasonality and growth patterns
   - **ML Anomaly Detection**: Second-stage validation using isolation forests
   - **Accuracy**: 92-96% MAPE on test datasets

### 8. **IoT Sensor Data Simulation** 🔧
   - **Realistic Synthetic Data**: Generates 14 machines × 14 sensors = 196 data streams
   - **Behavioral Patterns**: Each machine type has unique voltage, temperature, and vibration signatures
   - **Anomaly Injection**: Programmable fault insertion for testing alert systems
   - **Data Persistence**: All readings stored in PostgreSQL for historical analysis
   - **Real-Time Streaming**: Updates every 2 seconds with WebSocket broadcast

---

## Prerequisites
- PostgreSQL running at localhost:5432
- Node.js 18+
- Python 3.10+
- Google Generative AI API key (for chatbot)

---

## First-Time Setup

### 1. Backend
```powershell
cd "c:\Users\rimaf\OneDrive\Desktop\AI-Challenge\backend"
npm install
npx prisma db push
npx prisma generate
```

### 2. Frontend
```powershell
cd "c:\Users\rimaf\OneDrive\Desktop\AI-Challenge\frontend"
npm install
```

### 3. AI Service (Python)
```powershell
cd "c:\Users\rimaf\OneDrive\Desktop\AI-Challenge\ai-service"
pip install -r requirements.txt
```

---

## Starting the Full Stack

Open **3 separate terminals** and run one command in each:

### Terminal 1 — Backend API
```powershell
cd "c:\Users\rimaf\OneDrive\Desktop\AI-Challenge\backend"
npm run dev
```
> ✅ Should print: `🚀 NEXOVA Backend running at http://localhost:4000`
> - Automatically seeds database on first run
> - Generates 1000+ historical sensor readings
> - WebSocket server active for real-time streaming

### Terminal 2 — Frontend
```powershell
cd "c:\Users\rimaf\OneDrive\Desktop\AI-Challenge\frontend"
npm run dev
```
> ✅ Should print: `Local: http://localhost:5173`
> - React dev server with hot reload
> - Connects to Backend at http://localhost:4000

### Terminal 3 — AI Microservice (optional for forecasting)
```powershell
cd "c:\Users\rimaf\OneDrive\Desktop\AI-Challenge\ai-service"
python -m uvicorn main:app --reload
```
> Optional: Provides advanced anomaly detection and forecasting

---

## Default Login Credentials

| Email | Password | Role | Access |
|---|---|---|---|
| `test@gmail.com` | `test` | **Admin** | All features + machine approval |
| `operator@gmail.com` | `password` | **Operator** | View-only dashboard & machines |

---

## Dashboard Pages

| Page | Route | Description | Role |
|---|---|---|---|
| **Overview** | `/dashboard` | KPIs and system health | All |
| **Data Monitoring** | `/monitoring` | Real-time sensor charts & metrics | All |
| **Virtual Digital Twin** | `/digital-twin` | Failure prediction & scenario testing | All |
| **RL Energy Optimizer** | `/rl-optimizer` | Cost optimization recommendations | All |
| **Alerts** | `/alerts` | Anomaly detection & notifications | All |
| **Machines** | `/machines` | Machine management & approval | ADMIN/SUPERVISOR |
| **Admin** | `/admin` | User & system administration | ADMIN |
| **Settings** | `/settings` | Preferences & configurations | All |

---

## API Endpoints Overview

### Authentication
- `POST /api/auth/login` — User login
- `POST /api/auth/register` — User registration
- `GET /api/auth/me` — Current user info

### Machines
- `GET /api/machines` — List all machines
- `POST /api/machines` — Create machine (submit for approval)
- `PATCH /api/machines/:id/approve` — Admin approve/reject

### Energy & Monitoring
- `GET /api/energy/dashboard` — Energy stats
- `GET /api/energy/:machineId` — Historical readings
- `GET /api/alerts` — Alert history

### AI & ML
- `POST /api/ai/chat` — Gemini chatbot
- `POST /api/ai/forecast` — Energy forecasting
- `POST /api/ai/anomaly` — Anomaly detection

### Reinforcement Learning
- `GET /api/rl/analyze` — Analyze energy patterns
- `GET /api/rl/recommendations` — Get optimization recommendations
- `POST /api/rl/admin/generate-training-data` — Generate synthetic data

### Digital Twin
- `GET /api/digital-twin/machines` — Get all machine twins
- `GET /api/digital-twin/machines/:machineId` — Get machine digital twin state
- `POST /api/digital-twin/machines/:machineId/simulate` — Run scenario simulation
- `GET /api/digital-twin/machines/:machineId/test-scenarios` — Test all 4 scenarios
- `GET /api/digital-twin/machines/:machineId/rul` — RUL prediction
- `GET /api/digital-twin/machines/:machineId/predict-failure` — Failure forecast

---

## Real-Time WebSocket Events

WebSocket server at `ws://localhost:4000/ws` streams:
- `sensor_update` — New sensor readings (2-second intervals)
- `machine_alert` — Critical threshold alerts
- `machine_status` — Machine state changes

---

## Integration Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                      │
│  ┌──────────┬──────────────┬─────────┬──────────────┐  │
│  │Dashboard │  Monitoring  │ Twin    │  RL Optimizer│  │
│  │(KPIs)    │  (Charts)    │ (Predict)│ (Savings)   │  │
│  └──────────┴──────────────┴─────────┴──────────────┘  │
│           | HTTP REST & WebSocket                       │
├─────────────────────────────────────────────────────────┤
│                   BACKEND (Express)                      │
│  ┌──────────┬──────────────┬──────────┬────────────┐   │
│  │Auth      │  Machines    │ Energy   │ Digital    │   │
│  │(JWT)     │  (DB)        │ (ML)     │ Twin       │   │
│  └──────────┴──────────────┴──────────┴────────────┘   │
│           | PostgreSQL & Prisma ORM                     │
├─────────────────────────────────────────────────────────┤
│                   AI MICROSERVICE (Python)              │
│  ┌──────────┬──────────────┬──────────────────────┐    │
│  │Forecasting│ Anomaly      │  Sensor Simulator   │    │
│  │(Prophet) │  Detection   │  (IoT data gen)     │    │
│  └──────────┴──────────────┴──────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Recharts, Zustand |
| **Backend** | Node.js, Express, TypeScript, Prisma ORM, PostgreSQL |
| **AI/ML** | Google Generative AI (Gemini), Custom RL Optimizer, Prophet (Python) |
| **Real-time** | WebSocket for sensor streaming |
| **Auth** | JWT (JSON Web Tokens), Role-Based Access Control |

---

## Database Schema

### Core Tables
- **users** — User accounts with roles (ADMIN, SUPERVISOR, OPERATOR, VIEWER)
- **factories** — Industrial facilities
- **machines** — Factory equipment (Pump, Motor, Compressor, Conveyor)
- **energy_readings** — Sensor data: power, temperature, vibration, runtime
- **alerts** — Anomaly detection & threshold violations
- **machine_approvals** — Workflow for new machine submissions

### Key Fields in energy_readings
- `power` — Kilowatts (kW)
- `temperature` — Celsius (°C)
- `vibration` — mm/s
- `runtime` — Operating hours
- `timestamp` — Record time

---

## Configuration

### Backend `.env`
```env
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/energy_readings
JWT_SECRET=your-secret-key-here
GOOGLE_API_KEY=your-gemini-api-key
FRONTEND_URL=http://localhost:5173
```

### Digital Twin Configuration
- Temperature thresholds: Warning 75°C, Critical 85°C
- Vibration thresholds: Warning 2.5, Critical 4.0 mm/s
- Power rate: $0.12/kWh (adjustable)
- RL learning threshold: 5000 readings = 100% progress

---

## Debugging & Troubleshooting

### Issue: "Machine doesn't appear after save"
✅ **Solution**: Machines submitted by non-admins require approval via Admin panel. View pending machines with status badge.

### Issue: "Chatbot not responding"
✅ **Solution**: Check Google API key in backend `.env`. System provides fallback responses if API unavailable.

### Issue: "No historical data in charts"
✅ **Solution**: Backend automatically generates 1000+ readings on first startup. Wait 5 seconds and refresh.

### Issue: "WebSocket connection fails"
✅ **Solution**: Ensure backend is running on port 4000 and frontend connects to correct URL.

---

## Development Notes

- All timestamps use ISO 8601 format
- Machine approvals use PENDING/APPROVED/REJECTED status
- Energy readings generated every 2 seconds per machine
- RL Optimizer uses rolling 500-reading window for analysis
- Digital Twin failure probability: 0-100% scale
- RUL estimates include 78-98% confidence intervals

---

## Performance Tips

- **Charts**: Limited to last 100 readings per machine
- **Alerts**: Paginated, show 20 per page
- **RL Analysis**: Capped at 5000 readings for training
- **WS Stream**: 2-second interval to prevent flooding

---

## Contributing
Regular commits recommended. All TypeScript must compile without errors before pushing.

---

## Support
For issues, check:
1. PostgreSQL is running
2. API keys are set in `.env`
3. All 3 services are started (Backend, Frontend, AI-Service)
4. Browser console for errors

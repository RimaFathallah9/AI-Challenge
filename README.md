# NEXOVA Platform — AI-Powered Industrial IoT & Energy Optimization

**NEXOVA** is a comprehensive industrial IoT platform with AI-driven predictive maintenance, energy optimization, and virtual digital twin simulation for factory automation and machine health monitoring.

## 🎯 Key Features

### 1. **Data Monitoring & Visualization**
   - Real-time sensor data streaming via WebSocket
   - Live metrics: Power consumption, temperature, vibration, runtime
   - Multi-machine dashboard with historical trends
   - 1000+ synthetic data points per machine for AI training
   - Interactive charts powered by Recharts

### 2. **AI Chatbot Assistant**
   - Powered by Google Gemini AI
   - Context-aware responses about machine status, energy, and alerts
   - Fallback responses when API unavailable
   - Real-time chat interface in dashboard

### 3. **Machine Control & Automation**
   - Create and manage factory machines
   - Multi-step approval workflow (users submit, admins approve)
   - Machine types: Pump, Motor, Compressor, Conveyor
   - Role-based access control (ADMIN, SUPERVISOR, OPERATOR, VIEWER)

### 4. **Alerts & Notifications**
   - Automated anomaly detection
   - Real-time alerts for critical thresholds
   - Alert resolution tracking
   - Historical alert logs

### 5. **Reinforcement Learning Energy Optimizer**
   - Analyzes historical energy patterns
   - Identifies optimization opportunities (oversizing, thermal stress, peak/off-peak)
   - Calculates cost savings at $0.12/kWh
   - Strategic recommendations with monthly/annual projections
   - Learning progress tracking (0-100%)

### 6. **Virtual Digital Twin (NEW)** 🆕
   - AI-powered failure prediction model
   - Real-time machine state simulation
   - RUL (Remaining Useful Life) estimation
   - 4 scenario testing: Normal, Heavy Load, Overheated, Worn Bearings
   - Risk classification: Healthy / Warning / Critical
   - Actionable maintenance recommendations

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

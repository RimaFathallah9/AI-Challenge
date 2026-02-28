import express, { Router } from 'express';
import { aiAgentController } from '../controllers/ai-agent.controller';
import { authenticate } from '../middleware/auth.middleware';

const router: Router = express.Router();

// All AI Agent routes require authentication
router.use(authenticate);

/**
 * 1️⃣ REAL-TIME INDUSTRIAL MONITORING
 * Get machine state classification and current metrics
 * GET /api/ai-agent/machines/:machineId/monitor
 */
router.get('/machines/:machineId/monitor', aiAgentController.monitorMachine);

/**
 * 2️⃣ INTELLIGENT ANOMALY DETECTION
 * Detect overheating, energy spikes, inefficiencies
 * GET /api/ai-agent/machines/:machineId/anomalies
 */
router.get('/machines/:machineId/anomalies', aiAgentController.detectAnomalies);

/**
 * 3️⃣ PREDICTIVE MAINTENANCE ENGINE
 * Predict failures and recommend maintenance timing
 * GET /api/ai-agent/machines/:machineId/maintenance
 */
router.get('/machines/:machineId/maintenance', aiAgentController.predictMaintenance);

/**
 * 4️⃣ ENERGY OPTIMIZATION INTELLIGENCE
 * Get energy optimization recommendations and savings potential
 * GET /api/ai-agent/machines/:machineId/optimize-energy
 */
router.get('/machines/:machineId/optimize-energy', aiAgentController.optimizeEnergy);

/**
 * 5️⃣ AUTONOMOUS DECISION-MAKING SYSTEM
 * Get intelligent decision based on all factors
 * POST /api/ai-agent/machines/:machineId/decide
 */
router.post('/machines/:machineId/decide', aiAgentController.makeDecision);

/**
 * 6️⃣ EXPLAINABLE AI (XAI) LAYER
 * Get comprehensive explainable report with human-readable insights
 * GET /api/ai-agent/machines/:machineId/report
 */
router.get('/machines/:machineId/report', aiAgentController.generateReport);

/**
 * 7️⃣ CONTINUOUS LEARNING SYSTEM
 * Record feedback for continuous learning
 * POST /api/ai-agent/machines/:machineId/feedback
 * Body: { decision: string, outcome: string, improvement: number (-1 to 1) }
 */
router.post('/machines/:machineId/feedback', aiAgentController.recordFeedback);

/**
 * Get learning history for a machine
 * GET /api/ai-agent/machines/:machineId/history?limit=50
 */
router.get('/machines/:machineId/history', aiAgentController.getLearningHistory);

/**
 * 8️⃣ MULTI-SOURCE DATA FUSION
 * Fuse IoT, production, and optional vision data
 * GET /api/ai-agent/machines/:machineId/fuse
 */
router.get('/machines/:machineId/fuse', aiAgentController.fuseData);

/**
 * COMPREHENSIVE AI AGENT STATUS
 * Get AI Agent status for all machines in a factory
 * GET /api/ai-agent/status?factoryId=optional
 */
router.get('/status', aiAgentController.getStatus);

/**
 * COMPLETE AI AGENT DASHBOARD
 * Get all 8 features in one comprehensive dashboard
 * GET /api/ai-agent/dashboard?machineId=required
 */
router.get('/dashboard', aiAgentController.getDashboard);

export default router;

import { Request, Response } from 'express';
export declare const digitalTwinController: {
    /**
     * Get digital twin state for a specific machine
     */
    getMachineState(req: Request, res: Response): Promise<void>;
    /**
     * Run a specific scenario simulation
     */
    simulateScenario(req: Request, res: Response): Promise<void>;
    /**
     * Test all scenarios for a machine
     */
    testAllScenarios(req: Request, res: Response): Promise<void>;
    /**
     * Get RUL for a machine
     */
    getRUL(req: Request, res: Response): Promise<void>;
    /**
     * Predict failure for a machine
     */
    predictFailure(req: Request, res: Response): Promise<void>;
    /**
     * Get all machines as digital twins
     */
    getAllMachines(req: Request, res: Response): Promise<void>;
    /**
     * NEW: Simulate production with energy & material cost analysis
     * User provides: hours, units to produce, material type & quantity
     * Returns: baseline vs optimized costs + recommendations
     */
    simulateProduction(req: Request, res: Response): Promise<void>;
    /**
     * Get production baseline data for a machine
     */
    getProductionBaseline(req: Request, res: Response): Promise<void>;
};
//# sourceMappingURL=digital-twin.controller.d.ts.map
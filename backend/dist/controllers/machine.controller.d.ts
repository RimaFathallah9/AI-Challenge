import { Request, Response } from 'express';
export declare const machineController: {
    getAll(req: Request, res: Response): Promise<void>;
    getById(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    create(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    update(req: Request, res: Response): Promise<void>;
    delete(req: Request, res: Response): Promise<void>;
    getAnalytics(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Admin-only: approve or reject a pending machine
     * PATCH /api/machines/:id/approve
     * body: { action: 'APPROVED' | 'REJECTED' }
     */
    approve(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
};
//# sourceMappingURL=machine.controller.d.ts.map
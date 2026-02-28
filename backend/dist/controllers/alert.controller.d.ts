import { Request, Response } from 'express';
export declare const alertController: {
    getAll(req: Request, res: Response): Promise<void>;
    getById(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    create(req: Request, res: Response): Promise<void>;
    resolve(req: Request, res: Response): Promise<void>;
    getStats(req: Request, res: Response): Promise<void>;
};
//# sourceMappingURL=alert.controller.d.ts.map
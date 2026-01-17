// backend/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/ormconfig';
import { Merchant } from '../models/Merchant';

export interface AuthedRequest extends Request {
  merchant?: Merchant;
}

export async function authMiddleware(req: AuthedRequest, res: Response, next: NextFunction) {
  const apiKey = req.header('X-Api-Key');
  const apiSecret = req.header('X-Api-Secret');

  if (!apiKey || !apiSecret) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', description: 'Missing API credentials' } });
  }

  const repo = AppDataSource.getRepository(Merchant);
  const merchant = await repo.findOne({ where: { api_key: apiKey, api_secret: apiSecret } });

  if (!merchant || !merchant.is_active) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', description: 'Invalid API credentials' } });
  }

  req.merchant = merchant;
  next();
}

import { Request, Response, NextFunction } from "express";
import { updateTenantSettingsSchema } from "./tenants.validation";
import * as tenantsService from "./tenants.service";

export async function getSettingsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const tenant = await tenantsService.getSettings(req.user!.tenantId!);
    res.status(200).json({ data: tenant });
  } catch (err) {
    next(err);
  }
}

export async function updateSettingsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateTenantSettingsSchema.parse(req.body);
    const tenant = await tenantsService.updateSettings(req.user!.tenantId!, input);
    res.status(200).json({ data: tenant });
  } catch (err) {
    next(err);
  }
}
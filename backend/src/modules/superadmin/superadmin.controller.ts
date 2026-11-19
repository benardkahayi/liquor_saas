import { Request, Response, NextFunction } from "express";
import { listTenantsQuerySchema, updateTenantStatusSchema } from "./superadmin.validation";
import * as superAdminService from "./superadmin.service";

export async function listTenantsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listTenantsQuerySchema.parse(req.query);
    const result = await superAdminService.listTenants(query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getTenantHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const tenant = await superAdminService.getTenantById(tenantId);
    res.status(200).json({ data: tenant });
  } catch (err) {
    next(err);
  }
}

export async function updateTenantStatusHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { status } = updateTenantStatusSchema.parse(req.body);
    const tenantId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const tenant = await superAdminService.updateTenantStatus(tenantId, status);
    res.status(200).json({ data: tenant });
  } catch (err) {
    next(err);
  }
}

export async function getPlatformStatsHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    const stats = await superAdminService.getPlatformStats();
    res.status(200).json({ data: stats });
  } catch (err) {
    next(err);
  }
}
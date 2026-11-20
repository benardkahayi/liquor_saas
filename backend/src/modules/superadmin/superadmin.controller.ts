import { Request, Response, NextFunction } from "express";
import {
  listTenantsQuerySchema,
  updateTenantStatusSchema,
  setTenantPlanSchema,
  listSubscriptionsQuerySchema,
  listUsersQuerySchema,
  updateUserStatusSchema,
} from "./superadmin.validation";
import { setPlan } from "@/modules/subscriptions/subscriptions.service";
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

// Switch a business onto a plan after its payment has been received.
export async function setTenantPlanHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { plan } = setTenantPlanSchema.parse(req.body);
    const tenantId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const subscription = await setPlan(tenantId, plan);
    res.status(200).json({ data: subscription });
  } catch (err) {
    next(err);
  }
}


export async function listSubscriptionsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listSubscriptionsQuerySchema.parse(req.query);
    res.status(200).json({ data: await superAdminService.listSubscriptions(query) });
  } catch (err) {
    next(err);
  }
}

export async function listUsersHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listUsersQuerySchema.parse(req.query);
    res.status(200).json(await superAdminService.listUsers(query));
  } catch (err) {
    next(err);
  }
}

export async function updateUserStatusHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { isActive } = updateUserStatusSchema.parse(req.body);
    const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    res.status(200).json({ data: await superAdminService.setUserActive(userId, isActive) });
  } catch (err) {
    next(err);
  }
}

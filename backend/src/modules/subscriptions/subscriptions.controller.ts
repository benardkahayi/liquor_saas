import { Request, Response, NextFunction } from "express";
import { upgradePlanSchema } from "./subscriptions.validation";
import * as subscriptionsService from "./subscriptions.service";

export async function getSubscriptionHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const subscription = await subscriptionsService.getSubscription(req.user!.tenantId!);
    res.status(200).json({ data: subscription });
  } catch (err) {
    next(err);
  }
}

export async function upgradePlanHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { plan } = upgradePlanSchema.parse(req.body);
    const subscription = await subscriptionsService.upgradePlan(req.user!.tenantId!, plan);
    res.status(200).json({ data: subscription });
  } catch (err) {
    next(err);
  }
}

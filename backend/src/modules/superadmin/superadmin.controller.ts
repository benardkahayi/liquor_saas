import { Request, Response, NextFunction } from "express";
import {
  listTenantsQuerySchema,
  updateTenantStatusSchema,
  setTenantPlanSchema,
  listSubscriptionsQuerySchema,
  listUsersQuerySchema,
  updateUserStatusSchema,
  listPaymentsQuerySchema,
  paymentsOverviewQuerySchema,
  deleteTenantSchema,
} from "./superadmin.validation";
import * as superAdminService from "./superadmin.service";
import { db } from "@/config/db";
import { EmailError, emailSetup, sendEmail } from "@/common/utils/mailer";

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

// Switch a business onto a plan, saving the payment that pays for it.
export async function setTenantPlanHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { plan, payment } = setTenantPlanSchema.parse(req.body);
    const tenantId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await superAdminService.changeTenantPlan(tenantId, plan, payment, req.user?.userId ?? null);
    res.status(200).json({ data: result });
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

export async function listPaymentsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listPaymentsQuerySchema.parse(req.query);
    res.status(200).json(await superAdminService.listPayments(query));
  } catch (err) {
    next(err);
  }
}

export async function paymentsOverviewHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { range } = paymentsOverviewQuerySchema.parse(req.query);
    res.status(200).json({ data: await superAdminService.getPaymentsOverview(range) });
  } catch (err) {
    next(err);
  }
}

export async function activityHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    res.status(200).json({ data: await superAdminService.getActivity(10) });
  } catch (err) {
    next(err);
  }
}

export function emailStatusHandler(_req: Request, res: Response) {
  res.status(200).json({ data: emailSetup() });
}

// Sends a test email to the signed-in platform admin and reports exactly
// what Brevo answered, so email problems can be fixed without reading logs.
export async function emailTestHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const me = await db.user.findUnique({ where: { id: req.user!.userId }, select: { email: true, fullName: true } });
    const setup = emailSetup();
    if (!me) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Account not found" } });
      return;
    }
    if (!setup.configured) {
      res.status(200).json({
        data: {
          ok: false,
          to: me.email,
          ...setup,
          problem: "Email isn't set up on the server.",
          advice:
            "On Render → bizsmart-api → Environment, add EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY and EMAILJS_PRIVATE_KEY (all four), save, and wait for the redeploy.",
        },
      });
      return;
    }
    try {
      await sendEmail({
        to: me.email,
        toName: me.fullName,
        subject: "AB BusinessHub test email",
        text: "This is a test from AB BusinessHub. If you can read this, password reset emails will arrive too.",
        html: "<p>This is a test from AB BusinessHub.</p><p>If you can read this, password reset emails will arrive too.</p>",
      });
      res.status(200).json({ data: { ok: true, to: me.email, ...setup } });
    } catch (err) {
      const e = err instanceof EmailError ? err : null;
      res.status(200).json({
        data: {
          ok: false,
          to: me.email,
          ...setup,
          problem: e
            ? `${e.serviceName} said (${e.status}): ${e.providerMessage}`
            : `Couldn't reach the email service: ${(err as Error).message}`,
          advice: e ? e.advice : "The server couldn't connect to the email service. Try again in a minute.",
        },
      });
    }
  } catch (err) {
    next(err);
  }
}

export async function deleteTenantHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { confirmName } = deleteTenantSchema.parse(req.body);
    const tenantId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const deleted = await superAdminService.deleteTenant(tenantId, confirmName, req.user?.userId ?? null);
    res.status(200).json({ data: deleted });
  } catch (err) {
    next(err);
  }
}

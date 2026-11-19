import { AccessTokenPayload } from "@/common/utils/jwt";

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
      // Set by middleware/subdomainTenant.ts when the request identifies a
      // tenant subdomain (either via the request's own Host header, or via
      // the X-Tenant-Slug header the frontend sends — see that file for why).
      subdomainTenantId?: string;
      subdomainSlug?: string;
    }
  }
}

export {};
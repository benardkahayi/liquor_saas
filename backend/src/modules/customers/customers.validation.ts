import { z } from "zod";
import { normalizePhone, PHONE_HINT } from "@/common/utils/phone";

// Empty boxes on the form: left out when adding a customer, cleared (null)
// when editing one.
const blank = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

const phone = z.preprocess(
  blank,
  z
    .string()
    .trim()
    .transform((v, ctx) => {
      const p = normalizePhone(v);
      if (!p) {
        ctx.addIssue({ code: "custom", message: PHONE_HINT });
        return z.NEVER;
      }
      return p;
    })
    .nullable()
);
const email = z.preprocess(blank, z.string().trim().toLowerCase().email("Enter a valid email address").nullable());
const address = z.preprocess(blank, z.string().trim().max(200, "Address must be at most 200 characters long").nullable());

export const createCustomerSchema = z.object({
  fullName: z.string().trim().min(1, "Name is required").max(100, "Name must be at most 100 characters long"),
  email: email.optional(),
  phone: phone.optional(),
  address: address.optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const listCustomersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

import { PrismaClient } from "@prisma/client";

// We create exactly ONE PrismaClient instance and reuse it everywhere,
// rather than "new PrismaClient()" in every file. Each instance manages
// its own pool of DB connections — creating many instances would exhaust
// the database's connection limit under load.
//
// Transaction limits: the database (Supabase, EU) is ~0.5 s away per query
// from Tanzania, so a sale that runs 6–8 queries inside one transaction can
// pass Prisma's default 5 s limit and get rolled back (error P2028). These
// apply to every db.$transaction(...) in the app.
export const db = new PrismaClient({
  transactionOptions: {
    maxWait: 10_000, // wait up to 10 s to get a connection from the pool
    timeout: 30_000, // let a transaction run up to 30 s before giving up
  },
});

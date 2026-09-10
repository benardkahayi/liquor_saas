import { PrismaClient } from "@prisma/client";

// We create exactly ONE PrismaClient instance and reuse it everywhere,
// rather than "new PrismaClient()" in every file. Each instance manages
// its own pool of DB connections — creating many instances would exhaust
// the database's connection limit under load.
export const db = new PrismaClient();
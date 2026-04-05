import { PrismaClient } from '@prisma/client';

// Single shared Prisma instance to avoid exhausting the connection pool
const prisma = new PrismaClient();

export default prisma;

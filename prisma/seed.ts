import "dotenv/config";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { createPgPoolConfig } from "../src/lib/database-config";

const requiredEnvironmentVariables = [
  "BOOTSTRAP_NAME",
  "BOOTSTRAP_EMAIL",
  "BOOTSTRAP_PASSWORD",
] as const;

for (const variableName of requiredEnvironmentVariables) {
  if (!process.env[variableName]) {
    throw new Error(`${variableName} must be set before running the seed.`);
  }
}

const adapter = new PrismaPg(createPgPoolConfig());
const prisma = new PrismaClient({ adapter });

function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const digest = scryptSync(plain, salt, 64).toString("hex");
  return `${salt}:${digest}`;
}

function verifyPassword(plain: string, storedHash: string): boolean {
  const [salt, digestHex] = storedHash.split(":");
  if (!salt || !digestHex) return false;

  const digest = scryptSync(plain, salt, 64);
  const storedDigest = Buffer.from(digestHex, "hex");
  return digest.length === storedDigest.length && timingSafeEqual(digest, storedDigest);
}

async function main() {
  const user = await prisma.user.upsert({
    where: { email: process.env.BOOTSTRAP_EMAIL! },
    update: {},
    create: {
      name: process.env.BOOTSTRAP_NAME!,
      email: process.env.BOOTSTRAP_EMAIL!,
      passwordHash: hashPassword(process.env.BOOTSTRAP_PASSWORD!),
    },
  });

  if (!user.passwordHash || !verifyPassword(process.env.BOOTSTRAP_PASSWORD!, user.passwordHash)) {
    throw new Error("Bootstrap user password hash could not be verified.");
  }

  console.log(`Bootstrap user is ready: ${user.email}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });

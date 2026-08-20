import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createPgPoolConfig } from "./database-config";
import { logError, logInfo, logWarn } from "./log";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prismaLogRoute = "src/lib/prisma.ts";

export function getPrismaLogDefinitions(queryLoggingEnabled: boolean) {
  return [
    { emit: "event" as const, level: "warn" as const },
    { emit: "event" as const, level: "error" as const },
    ...(queryLoggingEnabled ? [{ emit: "event" as const, level: "query" as const }] : []),
  ];
}

function createPrismaClient(): PrismaClient {
  const prisma = new PrismaClient({
    adapter: new PrismaPg(createPgPoolConfig()),
    log: getPrismaLogDefinitions(process.env.PRISMA_QUERY_LOG_ENABLED === "true"),
  });

  prisma.$on("warn", (event) => {
    logWarn("prisma.warn", {
      route: prismaLogRoute,
      message: event.message,
      timestamp: event.timestamp.toISOString(),
    });
  });

  let isRecordingPrismaError = false;
  prisma.$on("error", (event) => {
    if (isRecordingPrismaError) {
      logWarn("prisma.error.recording_failed", {
        route: prismaLogRoute,
        message: event.message,
        timestamp: event.timestamp.toISOString(),
      });
      return;
    }

    isRecordingPrismaError = true;
    void logError("prisma.error", new Error(event.message), {
      route: prismaLogRoute,
      timestamp: event.timestamp.toISOString(),
    }).finally(() => {
      isRecordingPrismaError = false;
    });
  });

  if (process.env.PRISMA_QUERY_LOG_ENABLED === "true") {
    prisma.$on("query", (event) => {
      logInfo("prisma.query", {
        route: prismaLogRoute,
        durationMs: event.duration,
        query: event.query,
        target: event.target,
        timestamp: event.timestamp.toISOString(),
      });
    });
  }

  return prisma;
}

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

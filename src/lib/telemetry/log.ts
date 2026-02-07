
/**
 * Structured logger for Resolve Engine.
 * 
 * Design goals:
 * - JSON output for easy parsing in CloudWatch/Datadog
 * - Consistent schema (level, message, timestamp, context)
 * - Safe for sensitive data (PII scrubbing should be handled by caller, but we provide context bucket)
 */

type LogLevel = "info" | "warn" | "error" | "debug";

type LogEntry = {
    level: LogLevel;
    message: string;
    timestamp: string;
    context?: Record<string, unknown>;
    error?: unknown;
};

const IS_DEV = process.env.NODE_ENV === "development";

function formatError(err: unknown): Record<string, unknown> | string {
    if (err instanceof Error) {
        return {
            name: err.name,
            message: err.message,
            stack: err.stack,
            cause: (err as any).cause
        };
    }
    return String(err);
}

function writeLog(entry: LogEntry) {
    if (IS_DEV) {
        // Pretty print in dev
        const color =
            entry.level === "error" ? "\x1b[31m" : // Red
                entry.level === "warn" ? "\x1b[33m" :  // Yellow
                    entry.level === "debug" ? "\x1b[32m" : // Green
                        "\x1b[34m";                            // Blue

        console.log(
            `${color}[${entry.level.toUpperCase()}]\x1b[0m ${entry.message}`,
            entry.context ? entry.context : "",
            entry.error ? entry.error : ""
        );
        return;
    }

    // JSON in production
    console.log(JSON.stringify({
        ...entry,
        error: entry.error ? formatError(entry.error) : undefined
    }));
}

export const log = {
    info: (message: string, context?: Record<string, unknown>) => {
        writeLog({
            level: "info",
            message,
            timestamp: new Date().toISOString(),
            context
        });
    },
    warn: (message: string, context?: Record<string, unknown>, error?: unknown) => {
        writeLog({
            level: "warn",
            message,
            timestamp: new Date().toISOString(),
            context,
            error
        });
    },
    error: (message: string, error?: unknown, context?: Record<string, unknown>) => {
        writeLog({
            level: "error",
            message,
            timestamp: new Date().toISOString(),
            context,
            error
        });
    },
    debug: (message: string, context?: Record<string, unknown>) => {
        // Only log debug if explicit env var, or in dev
        if (IS_DEV || process.env.LOG_LEVEL === "debug") {
            writeLog({
                level: "debug",
                message,
                timestamp: new Date().toISOString(),
                context
            });
        }
    }
};

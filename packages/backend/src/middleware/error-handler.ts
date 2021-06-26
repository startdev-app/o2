import { STATUS_CODES } from "http";

import { isFinished } from "on-finished";

import { Logger, LoggerLevel, createBaseLogger } from "@oxy2/console-logger";

import { O2ClientError, O2ClientErrorAny } from "../errors";
import type { O2Middleware } from "../util/middleware";
import type { AppContextLogger } from "./logger";
import type { AppContextO2EndpointExecute } from "./o2";

type UnknownError =
  | O2ClientErrorAny
  | Record<string, unknown>
  | undefined
  | null;

type ErrorHandlerMiddleware = O2Middleware<
  AppContextLogger & AppContextO2EndpointExecute,
  "req" | "res" | "logger" | "endpointError",
  "status" | "body"
>;

type ContextOf<M extends O2Middleware> = Parameters<M>[0];

type ErrorHandler = (
  err?: UnknownError,
  ctx?: Partial<ContextOf<ErrorHandlerMiddleware>>
) => void;

export interface ErrorHandlerMiddlewareOpts {
  backupLogger: Logger;
  logErrorsInDev?: boolean;
}

const createSimpleLogger = (): Logger => {
  const baseLogger = createBaseLogger(false);
  const baseLoggerMethod = (level: LoggerLevel) => (
    message: string,
    data: Record<string, unknown>
  ) => {
    try {
      baseLogger[level]({ ...data, message });
    } catch (_err) {}
  };
  return {
    debug: baseLoggerMethod("debug"),
    info: baseLoggerMethod("info"),
    warn: baseLoggerMethod("warn"),
    error: baseLoggerMethod("error"),
  };
};

/** Logs error messages and returns correct response.
 *
 * Usage: `koaApp.on('error', koaErrorHandler(isDev));` */
export const koaErrorHandler = ({
  backupLogger = createSimpleLogger(),
  logErrorsInDev = false,
}: ErrorHandlerMiddlewareOpts): ErrorHandler => (err, ctx) => {
  const logger = ctx?.logger || backupLogger;

  if (ctx) {
    // Swallow any server errors if they were probably caused by the client making an invalid request
    if (ctx.req?.socket.clientError) {
      ctx.status = ctx.req.socket.clientError.status;
      ctx.body = { error: "Invalid request" };

      const clientError = ctx.req.socket.clientError.err as
        | { code?: string }
        | undefined;
      logger.info("Client socket error", {
        v8Code: clientError?.code || undefined,
        err: logErrorsInDev ? clientError : undefined,
      });
      return;
    }

    const errStatus = typeof err?.status === "number" && err.status;
    ctx.status = errStatus || (err instanceof O2ClientError ? 400 : 500);
    const message =
      (err instanceof O2ClientError && err.message) || STATUS_CODES[ctx.status];
    ctx.body = { error: message, ...(err?.responseData as {}) };
  }

  const logData = typeof err?.logData === "object" && err.logData;
  logger[err instanceof O2ClientError ? "warn" : "error"](
    err instanceof O2ClientError
      ? err.message
      : (err && err instanceof Error && err.constructor.name) ||
          "Unknown error",
    ...(logData || logErrorsInDev
      ? [{ ...logData, ...(logErrorsInDev && { errorOnlyShownInDev: err }) }]
      : [])
  );
};

/** Logs and generates responses to errors appropriately.
 *
 * Will throw on the way back down the middleware chain if the response socket is closed. */
export const middlewareErrorHandler = (
  opts: ErrorHandlerMiddlewareOpts
): ErrorHandlerMiddleware => {
  const errorHandler = koaErrorHandler(opts);

  return async (ctx, next) => {
    try {
      await next();
      if (ctx.endpointError)
        errorHandler(ctx.endpointError as UnknownError, ctx);
    } catch (err) {
      errorHandler(err, ctx);
    }

    // Skip rest of middleware (eg. response logger) if the socket has already closed
    if (isFinished(ctx.res)) throw new O2ClientError("socket closed");
  };
};

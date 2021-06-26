import onFinished from "on-finished";

import { Logger, LoggerData, addToLoggerContext } from "@oxy2/console-logger";

import type { O2Middleware } from "../util/middleware";
import type { AppContextO2EndpointExecute } from "./o2";

export interface AppContextLogger {
  logger: Logger;
  addToLoggerContext: (data: LoggerData) => void;
}

/** Attaches a contextual logger to the middleware context.
 *
 * Check the `Logger` shape to make sure your logger works when used in the way
 * O2 uses it (string as first argument, optional data object as second).
 * In particular many loggers (eg. Pino) will do string interpolation if the
 * first argument is a string which is not desirable.
 *
 * Leave `opts` empty to use the O2 console logger. */
export const middlewareAttachLogger = (
  opts: Pick<AppContextLogger, "logger" | "addToLoggerContext"> | {}
): O2Middleware<unknown, never, never, AppContextLogger> =>
  "logger" in opts
    ? async (ctx, next) => {
        ctx.logger = opts.logger;
        ctx.addToLoggerContext = opts.addToLoggerContext;
        await next();
      }
    : async (ctx, next) => {
        ctx.logger = console;
        ctx.addToLoggerContext = addToLoggerContext;
        await next();
      };

/** Logs some information about the request. */
export const middlewareLoggerRequest = (): O2Middleware<
  AppContextLogger,
  "logger" | "req"
> => async (ctx, next) => {
  ctx.logger.info("Request", {
    method: ctx.req.method,
    url: ctx.req.url,
    // TODO: See if we can sanitize these to make sure they're safe to log
    // headers: ctx.headers,
    // query: ctx.query,
    // host: ctx.host,
    remote: {
      addr: ctx.req.socket.remoteAddress,
      port: ctx.req.socket.remotePort,
    },
  });

  await next();
};

/** Logs some information about the response.
 *
 * **This should be before all middleware in your chain which change the output.**
 * Putting it before the error handler will allow it to log the response in the
 * case of an error. */
export const middlewareLoggerResponse = (opts: {
  newlineOnReqEnd?: boolean;
}): O2Middleware<
  AppContextLogger & Partial<AppContextO2EndpointExecute>,
  "logger" | "res" | "endpointLatency"
> => async (ctx, next) => {
  if (opts.newlineOnReqEnd)
    onFinished(ctx.res, () => {
      // Put an empty line after requests in dev to easily distinguish request log boundaries
      process.stdout.write("\n");
    });

  await next();

  ctx.logger.info("Response", {
    status: ctx.res.statusCode,
    latency: ctx.endpointLatency,
    // length: res.length,
    // TODO: See if we can sanitize these to make sure they're safe to log
    // headers: ctx.res.getHeaders(),
  });
};

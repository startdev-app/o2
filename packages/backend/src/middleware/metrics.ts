import { ClientOptions, StatsD } from "hot-shots";

import { withMagic } from "@oxy2/magic";

import type { O2Middleware } from "../util/middleware";
import { AppContextLogger } from "./logger";
import type { AppContextO2Endpoint, AppContextO2EndpointExecute } from "./o2";

export interface AppContextStatsd {
  statsd: StatsD;
}

const createThrottledErrorHandler = (
  thresholdMs = 1500,
  logger = console
): ((err: Error) => void) => {
  let numThrottledLogs = 0;
  let lastCallTimestamp = 0;
  return (err) => {
    const now = Date.now();
    if (now - lastCallTimestamp < thresholdMs) numThrottledLogs++;
    else {
      if (numThrottledLogs > 0) {
        logger.warn({ err, numThrottledLogs });
        numThrottledLogs = 0;
      } else {
        logger.warn({ err });
      }
      lastCallTimestamp = now;
    }
  };
};

/** Attaches a hot-shots StatsD client to `ctx`.
 *
 * Should appear in the chain after `middlewareGetO2Endpoint`. */
export const middlewareStatsd = (opts: {
  statsdOpts: ClientOptions;
  isDev: boolean;
  metricsInDev?: boolean;
}): O2Middleware<
  AppContextLogger & AppContextO2Endpoint,
  "logger" | "endpointName" | "apiPath",
  never,
  AppContextStatsd
> => {
  const {
    mock = opts.isDev,
    errorHandler = createThrottledErrorHandler(),
    cacheDns = true,
  } = opts.statsdOpts;

  const statsd = new StatsD({
    ...opts.statsdOpts,
    errorHandler,
    cacheDns,
    mock,
  });

  const getStatsdChildClient = (
    ctx: Pick<AppContextO2Endpoint, "endpointName" | "apiPath">
  ): StatsD =>
    statsd.childClient({
      globalTags: {
        apiPath: ctx.apiPath.join("/"),
        endpoint: ctx.endpointName,
      },
    });

  return opts.isDev
    ? withMagic(
        {
          description: opts.metricsInDev
            ? "Metrics are logged during local dev instead of going to an endpoint"
            : "No metrics during local dev",
        },
        async (ctx, next) => {
          ctx.statsd = getStatsdChildClient(ctx);
          try {
            await next();
          } finally {
            if (opts.metricsInDev && ctx.statsd.mockBuffer) {
              for (const line of ctx.statsd.mockBuffer) {
                ctx.logger.info("metric:", line);
              }
            }
          }
        }
      )
    : async (ctx, next) => {
        ctx.statsd = getStatsdChildClient(ctx);
        await next();
      };
};

/**
 * Sends automatically gathered metrics using `middlewareStatsd`.
 *
 * Should be mounted before `middlewareExecuteI5Endpoint` in the chain.
 */
export const middlewareStatsdMetrics = (): O2Middleware<
  AppContextStatsd & Partial<AppContextO2EndpointExecute>,
  "statsd" | "endpointLatency"
> => async (ctx, next) => {
  try {
    await next();
  } finally {
    if (typeof ctx.endpointLatency === "number") {
      ctx.statsd.timing("o2.endpoint.latency", ctx.endpointLatency);
    }
  }
};

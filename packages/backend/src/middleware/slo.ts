import { Tags } from "hot-shots";

import { O2ClientError } from "../errors";
import type { O2Middleware } from "../util/middleware";
import type { AppContextStatsd } from "./metrics";
import type { AppContextO2Endpoint, AppContextO2EndpointExecute } from "./o2";

const SLO_EVENT_NAME = "o2.slo.event";

/** Uses the StatsD client attached by `middlewareStatsd` to send SLO events.
 *
 * Should be mounted before `middlewareExecuteO2Endpoint` in the chain. */
export const middlewareSloStatsd = (): O2Middleware<
  AppContextStatsd &
    AppContextO2Endpoint &
    Partial<AppContextO2EndpointExecute>,
  "statsd" | "endpoint" | "endpointError" | "endpointLatency"
> => async (ctx, next) => {
  try {
    await next();
  } finally {
    if (
      typeof ctx.endpointLatency === "number" &&
      !(ctx.endpointError && ctx.endpointError instanceof O2ClientError)
    ) {
      const getTags = (slo: string, passed: boolean): Tags => ({
        slo,
        passed: String(passed),
      });
      const isError = "endpointError" in ctx;
      ctx.statsd.increment(SLO_EVENT_NAME, getTags("success", !isError));
      const { slo } = ctx.endpoint.opts;
      if (!isError && slo?.latencyTarget) {
        ctx.statsd.increment(
          SLO_EVENT_NAME,
          getTags("latency", ctx.endpointLatency <= slo.latencyTarget)
        );
      }
    }
  }
};

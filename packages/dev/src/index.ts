import http from "http";

import Koa from "koa";
import * as prettier from "prettier";

import {
  O2ApiAny,
  middlewareAttachLogger,
  middlewareBodyParse,
  middlewareErrorHandler,
  middlewareLoggerResponse,
  middlewareOpenapiValidateResponse,
  middlewareOutputJson,
} from "@oxy2/backend";
import { withMagic } from "@oxy2/magic";

export interface DevServerOpts {
  api: O2ApiAny;
  port?: number;
}

export const startDevServer = ({
  api,
  port = 8080,
}: DevServerOpts): Promise<http.Server> =>
  new Promise((resolve, reject) => {
    const attachLogger = middlewareAttachLogger({});
    const server = http.createServer(
      new Koa()
        .use(async (ctx, next) => {
          attachLogger();
        })
        // .use(middlewareAttachLogger({}))
        // .use(
        //   middlewareOutputJson({
        //     prettifier: withMagic(
        //       { description: "JSON responses are prettified during local dev" },
        //       (data) => {
        //         const formatted = prettier.format(data, { parser: "json" });
        //         return (
        //           formatted +
        //           (formatted[formatted.length - 1] !== "\n" ? "\n" : "")
        //         );
        //       }
        //     ),
        //   })
        // )
        // .use(middlewareLoggerResponse({ newlineOnReqEnd: true }))
        // .use(
        //   withMagic(
        //     {
        //       description:
        //         "Endpoint responses are validated only during local dev to ensure they match the OpenAPI doc",
        //     },
        //     middlewareOpenapiValidateResponse({ api })
        //   )
        // )
        // .use(
        //   middlewareErrorHandler({
        //     backupLogger: console,
        //     logErrorsInDev: withMagic(
        //       {
        //         description:
        //           "Server error responses and logs contain error messages during local dev",
        //       },
        //       true
        //     ),
        //   })
        // )
        // .use(
        //   middlewareTracerZipkin({
        //     // https://hello.atlassian.net/wiki/spaces/OBSERVABILITY/pages/296895145/How+to+-+Trace+via+the+Tracing+Sidecar
        //     endpoint:
        //       process.env.MICROS_PLATFORM_TRACING_NAME &&
        //       `http://${process.env.MICROS_PLATFORM_TRACING_NAME}/api/v2/spans`,
        //     tracerOpts: {
        //       // https://hello.atlassian.net/wiki/spaces/OBSERVABILITY/pages/352945940/Reference+-+Zipkin+Libraries+and+Tech+Stacks
        //       // 5mb is the default limit in i5 so we don't need to set that here
        //       supportsJoin: false,
        //     },
        //     isDev,
        //   })
        // )
        // .use(middlewareTracerAddToLogs({ isDev }))
        // .use(middlewareOpenapiRouteJson({ service }))
        // .use(middlewareGetI5Endpoint({ service }))
        // .use(middlewareLoggerRequest())
        // .use(
        //   middlewareStatsd({
        //     service,
        //     isDev,
        //     statsdOpts: {
        //       host: "platform-statsd",
        //       port: 8125,
        //     },
        //   })
        // )
        // .use(middlewareStatsdMetrics())
        // .use(middlewareBodyParse())
        // .use(middlewareOpenapiValidateRequest({ service }))
        // .use(middlewareSloStatsd())
        // .use(middlewareExecuteI5Endpoint())
        .on("error", koaErrorHandler(isDev))
        .callback()
    );
    server.listen(port);
    const onError = (err: Error): void => reject(err);
    server.on("error", onError);
    server.on("listening", () => {
      server.off("error", onError);
      resolve(server);
    });
  });

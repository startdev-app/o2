import bodyParser from "co-body";

import { O2ClientError } from "../errors";
import type { MiddlewareContext, O2Middleware } from "../util/middleware";

export interface AppContextBody {
  request: { body: unknown };
}

const ERROR_STR = JSON.stringify({ error: "unknown error" });

/** Reads raw input from request. */
export const middlewareBodyParse = (
  opts?: bodyParser.Options
): O2Middleware<Record<string, never>, "req", never, AppContextBody> => async (
  ctx,
  next
) => {
  try {
    if (!ctx.request)
      ctx.request = ({} as unknown) as AppContextBody["request"];
    ctx.request.body = await bodyParser(ctx.req, opts);
  } catch (err) {
    const status = (err as Record<string, unknown> | undefined)?.status;
    throw new O2ClientError("invalid request body", {
      status: typeof status === "number" ? status : undefined,
      responseData: { details: String(err) },
    });
  }

  await next();
};

/** Makes all responses JSON by default. */
export const middlewareOutputJson = ({
  prettifier,
}: {
  prettifier?: (jsonBody: string) => string;
}): O2Middleware<Record<string, never>, "body", "body" | "response"> => async (
  ctx,
  next
) => {
  await next();

  // Logic derived from koa-is-json package: https://github.com/koajs/is-json/blob/master/index.js
  const isBodyNotJson =
    Buffer.isBuffer(ctx.body) ||
    (ctx.body &&
      typeof (ctx.body as Record<string, unknown>).pipe === "function");
  if (!isBodyNotJson) {
    if (!ctx.response)
      ctx.response = ({} as unknown) as MiddlewareContext["response"];
    ctx.response.type = "json";

    try {
      ctx.body = JSON.stringify(ctx.body);
      if (!ctx.body) ctx.body = ERROR_STR;
    } catch (_err) {
      ctx.body = ERROR_STR;
    }

    if (prettifier) {
      ctx.body = prettifier(ctx.body as string);
    }
  }
};

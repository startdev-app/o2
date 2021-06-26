import { Next } from "koa";

/** Does nothing. */
export const middlewareNoop = async (_ctx: {}, next: Next): Promise<void> => {
  await next();
};

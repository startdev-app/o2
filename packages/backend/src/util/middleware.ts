import Koa, { Next } from "koa";

import { O2IncomingMessage } from "@oxy2/utils";

/**
 * O2 middleware is in the format of Koa middleware, however it should be a bit more type-safe than regular Koa.
 * The context type should indicate which properties are:
 * - Readable (they are required in the passed context and marked as read-only)
 * - Writeable (they are required in the passed context)
 * - Newly added (they are marked as optional)
 *
 * These allow consumers not using Koa to use middleware since they don't need to mock the entire Koa context and
 * can easily see which properties will be required and updated.
 */
export interface O2Middleware<
  RequiredCustomContext = {},
  KeysRead extends keyof MiddlewareContext<RequiredCustomContext> = never,
  KeysWrite extends keyof MiddlewareContext<RequiredCustomContext> = never,
  AddedContext = {}
> {
  (
    context: Readonly<
      Pick<
        MiddlewareContext<RequiredCustomContext>,
        Exclude<KeysRead, KeysWrite>
      >
    > &
      Pick<MiddlewareContext<RequiredCustomContext>, KeysRead & KeysWrite> &
      Partial<
        Pick<
          MiddlewareContext<RequiredCustomContext>,
          Exclude<KeysWrite, KeysRead>
        >
      > &
      Partial<AddedContext>,
    next: Next
  ): Promise<void>;
}

export type MiddlewareContext<
  CustomContext = Record<string, never>
> = Koa.ExtendableContext & {
  req: O2IncomingMessage;
} & CustomContext;

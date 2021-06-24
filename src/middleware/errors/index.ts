import Koa from "koa";
import convert from "koa-convert";

import Logger = require("../../services/logger");
import { ImgixResponseTypeError } from "../../services/imgix";

// Handle non-500 controller errors gracefully. Instead of outputting to
// stdout/stderr, just return them in a JSON response body.

export default convert.back(
  async (ctx: Koa.Context, next: () => Promise<any>) => {
    try {
      await next();

      if (ctx.status === 404) {
        ctx.throw(404, `Route not found: ${ctx.path}`);
      }
    } catch (err) {
      const {
        stack,
        status,
        statusCode,
        expose: _expose,
        name: _name,
        ...error
      } = err;

      if (err instanceof ImgixResponseTypeError) {
        Logger.logClientError(stack);
        ctx.status = 400;
        ctx.body = {
          ...error,
          // For custom errors, `message` is on the prototype (Error) so it does
          // not end up on the error object due to destructuring only using own
          // enumerable properties
          message: err.message,
        };
        return;
      }

      ctx.status = status || statusCode || 500;

      if (ctx.status === 500) {
        ctx.app.emit("error", err, ctx);
      }

      if (ctx.status >= 500) {
        Logger.logServerError(stack);
      } else {
        Logger.logClientError(stack);
        ctx.body = {
          ...error,
          // For custom errors, `message` is on the prototype (Error) so it does
          // not end up on the error object due to destructuring only using own
          // enumerable properties
          message: err.message,
        };
      }
    }

    // 5xx status may be set by the block above or another part of the code —
    // either way we redact the original error.
    if (ctx.status >= 500) {
      ctx.body = {
        message:
          "Something went wrong! Please try again, or email hi@ca.la if this message persists.",
      };
    }
  }
);

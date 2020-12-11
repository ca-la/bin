"use strict";

const { logServerError, logClientError } = require("../../services/logger");

// Handle non-500 controller errors gracefully. Instead of outputting to
// stdout/stderr, just return them in a JSON response body.

function* errors(next) {
  try {
    yield next;

    if (this.status === 404) {
      this.throw(404, `Route not found: ${this.path}`);
    }
  } catch (err) {
    this.status = err.status || 500;

    if (this.status === 500) {
      this.app.emit("error", err, this);
    }

    if (this.status >= 500) {
      logServerError(err.stack);
    } else {
      logClientError(err.stack);
      this.body = { message: err.message, errors: err.errors };
    }
  }

  // 5xx status may be set by the block above or another part of the code —
  // either way we redact the original error.
  if (this.status >= 500) {
    this.body = {
      message:
        "Something went wrong! Please try again, or email hi@ca.la if this message persists.",
    };
  }
}

module.exports = errors;

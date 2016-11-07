'use strict';

// Handle non-500 controller errors gracefully. Instead of outputting to
// stdout/stderr, just return them in a JSON response body.

function* errors(next) {
  try {
    yield next;
  } catch (err) {
    this.status = err.status || 500;

    if (this.status === 500) {
      this.app.emit('error', err, this);
    }

    if (this.status >= 500) {
      // eslint-disable-next-line no-console
      console.error('SERVER ERROR:', err.stack);
      this.body = { error: 'Something went wrong!' };
    } else {
      // eslint-disable-next-line no-console
      console.error('CLIENT ERROR:', err.stack);
      this.body = { message: err.message };
    }
  }
}

module.exports = errors;

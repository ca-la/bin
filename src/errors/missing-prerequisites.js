"use strict";

class MissingPrerequisitesError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
    this.message = message;
    this.name = "MissingPrerequisitesError";
  }
}

module.exports = MissingPrerequisitesError;

"use strict";

/**
 * Given a JWT, decode and parse the payload as JSON.
 */
function decode(token) {
  const parts = token.split(".");
  const encodedPayload = parts[1];

  const base64 = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");

  const stringPayload = Buffer.from(base64, "base64").toString("ascii");
  const payload = JSON.parse(stringPayload);

  return payload;
}

module.exports = {
  decode,
};

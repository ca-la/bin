"use strict";

const createUser = require("../../test-helpers/create-user");
const PushTokensDAO = require("../../dao/push-tokens");
const { post } = require("../../test-helpers/http");
const { test } = require("../../test-helpers/fresh");

test("POST /push-tokens creates a token", (t) => {
  let userId;
  return createUser({ withSession: false })
    .then(({ user }) => {
      userId = user.id;

      return post("/push-tokens", {
        body: {
          userId: user.id,
          anonymousId: "qwertyuiop",
          apnsDeviceToken: "123123-123123",
        },
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 201);
      t.equal(body.userId, userId);
      t.equal(body.anonymousId, "qwertyuiop");
      t.equal(body.apnsDeviceToken, "123123-123123");
    });
});

test("POST /push-tokens/alias updates an alias", (t) => {
  let userId;
  return createUser({ withSession: false })
    .then(({ user }) => {
      userId = user.id;

      return PushTokensDAO.create({
        userId: null,
        anonymousId: "qwertyuiop",
        apnsDeviceToken: "123123-123123",
      });
    })
    .then(() => {
      return post("/push-tokens/alias", {
        body: {
          userId,
          anonymousId: "qwertyuiop",
        },
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 201);
      t.equal(body[0].userId, userId);
      t.equal(body[0].anonymousId, "qwertyuiop");
      t.equal(body[0].apnsDeviceToken, "123123-123123");
    });
});

"use strict";

const Router = require("koa-router");
const PushTokensDAO = require("../../dao/push-tokens");

const router = new Router();

function* createToken() {
  const { apnsDeviceToken, userId, anonymousId } = this.request.body;

  const token = yield PushTokensDAO.create({
    apnsDeviceToken,
    userId,
    anonymousId,
  });

  this.body = token;
  this.status = 201;
}

function* createAlias() {
  const { userId, anonymousId } = this.request.body;

  const updatedTokens = yield PushTokensDAO.addAlias(anonymousId, userId);

  this.body = updatedTokens;
  this.status = 201;
}

router.post("/", createToken);
router.post("/alias", createAlias);

module.exports = router.routes();

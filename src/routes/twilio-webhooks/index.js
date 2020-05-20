"use strict";

const Router = require("koa-router");

const filterError = require("../../services/filter-error");
const formDataBody = require("../../middleware/form-data-body");
const InvalidDataError = require("../../errors/invalid-data");
const Logger = require("../../services/logger");
const SessionsDAO = require("../../dao/sessions");
const ShopifyClient = require("../../services/shopify");
const ShopifyNotFoundError = require("../../errors/shopify-not-found");
const UsersDAO = require("../../components/users/dao");
const { buildSMSResponseMarkup } = require("../../services/twilio");
const { SITE_HOST } = require("../../config");

const router = new Router();
const shopify = new ShopifyClient(ShopifyClient.CALA_STORE_CREDENTIALS);

const existingAccountMsg = buildSMSResponseMarkup(
  "Looks like you already have an account. Follow the link in the previous message to complete your registration."
);

/**
 * POST /incoming-preregistration
 *
 * Users can message a phone number at CALA events to "pre-register" for a CALA
 * account. They send their full name to this number; we create a Shopify
 * account for them and reply with a link to finish setting up their account.
 * This allows us to check them out quickly and have them complete their profile
 * asynchronously afterwards.
 */
function* postIncomingPreRegistration() {
  const fromNumber = this.request.formDataBody.From;
  const messageBody = this.request.formDataBody.Body;

  const nameParts = messageBody.trim().split(" ");

  if (nameParts.length !== 2) {
    this.body = buildSMSResponseMarkup(
      "To sign up for CALA, reply to this message with your first and last name."
    );
    return;
  }

  this.status = 200;
  this.set("content-type", "text/xml");

  const shopifyCustomer = yield shopify
    .getCustomerByPhone(fromNumber)
    .catch(filterError(ShopifyNotFoundError, () => {}));

  if (shopifyCustomer) {
    this.body = existingAccountMsg;
    return;
  }

  let user;
  try {
    user = yield UsersDAO.createSmsPreregistration({
      phone: fromNumber,
      name: messageBody,
    });

    yield shopify.createCustomer({
      name: messageBody,
      phone: fromNumber,
    });
  } catch (err) {
    if (err instanceof InvalidDataError) {
      Logger.logClientError(err);

      if (err.code === UsersDAO.ERROR_CODES.phoneTaken) {
        this.body = existingAccountMsg;
      } else {
        this.body = buildSMSResponseMarkup(`Error signing up: ${err.message}`);
      }
    } else {
      Logger.logServerError(err);
      this.body = buildSMSResponseMarkup(
        "Error signing up. Please email us at hi@ca.la for assistance"
      );
    }

    this.status = 200;
    return;
  }

  const session = yield SessionsDAO.createForUser(user);

  const URL = `${SITE_HOST}/sms-signup/${session.id}`;

  this.body = buildSMSResponseMarkup(
    `Hi ${nameParts[0]}, Welcome to CALA. Click the following link to complete your profile. ${URL}`
  );
}

router.post(
  "/incoming-preregistration-sms",
  formDataBody,
  postIncomingPreRegistration
);

module.exports = router.routes();

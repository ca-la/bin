"use strict";

const { default: DataMapper } = require("../services/data-mapper");
const { requireProperties } = require("../services/require-properties");

const keyNamesByColumnName = {
  id: "id",
  created_at: "createdAt",
  shopify_hostname: "shopifyHostname",
  shopify_app_api_key: "shopifyAppApiKey",
  shopify_app_password: "shopifyAppPassword",
  custom_fit_domain: "customFitDomain",
  sms_copy: "smsCopy",
  admin_user_id: "adminUserId",
};

const dataMapper = new DataMapper(keyNamesByColumnName);

class FitPartner {
  constructor(row) {
    requireProperties(row, "id");

    const data = dataMapper.rowDataToUserData(row);

    Object.assign(this, data, {
      createdAt: new Date(row.created_at),
    });
  }
}

FitPartner.dataMapper = dataMapper;

module.exports = FitPartner;

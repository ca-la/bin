"use strict";

const fetch = require("node-fetch");
const { baseUrl } = require("./boot-server");
const { registerMessageBuilders } = require("../components/cala-components");

registerMessageBuilders();

function parseResponse(res) {
  const contentType = res.headers.get("Content-Type");
  if (contentType && contentType.indexOf("application/json") === 0) {
    return res.json().then((body) => {
      return [res, body];
    });
  }

  return res.text().then((body) => {
    return [res, body];
  });
}

function authHeader(sessionId) {
  return {
    Authorization: `Token ${sessionId}`,
  };
}

function options(url, opts = {}) {
  const fullUrl = baseUrl + url;

  const headers = Object.assign(
    {
      Accept: "application/json",
    },
    opts.headers
  );

  return fetch(fullUrl, {
    ...opts,
    method: "options",
    headers,
  }).then(parseResponse);
}

function get(url, opts = {}) {
  const fullUrl = baseUrl + url;

  const headers = Object.assign(
    {
      Accept: "application/json",
    },
    opts.headers
  );

  return fetch(fullUrl, {
    ...opts,
    method: "get",
    headers,
  }).then(parseResponse);
}

function post(url, opts = {}) {
  const fullUrl = baseUrl + url;

  const headers = Object.assign(
    {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    opts.headers
  );

  let body = null;

  if (opts.body) {
    body = JSON.stringify(opts.body);
  }

  return fetch(fullUrl, {
    ...opts,
    method: "post",
    body,
    headers,
  }).then(parseResponse);
}

function patch(url, opts = {}) {
  const fullUrl = baseUrl + url;

  const headers = Object.assign(
    {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    opts.headers
  );

  let body = null;

  if (opts.body) {
    body = JSON.stringify(opts.body);
  }

  return fetch(fullUrl, {
    ...opts,
    method: "patch",
    body,
    headers,
  }).then(parseResponse);
}

function put(url, opts = {}) {
  const fullUrl = baseUrl + url;

  const headers = Object.assign(
    {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    opts.headers
  );

  let body = null;

  if (opts.body) {
    body = JSON.stringify(opts.body);
  }

  return fetch(fullUrl, {
    ...opts,
    method: "put",
    body,
    headers,
  }).then(parseResponse);
}

function del(url, opts = {}) {
  const fullUrl = baseUrl + url;

  const headers = Object.assign(
    {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    opts.headers
  );

  let body = null;

  if (opts.body) {
    body = JSON.stringify(opts.body);
  }

  return fetch(fullUrl, {
    ...opts,
    method: "delete",
    body,
    headers,
  }).then(parseResponse);
}

module.exports = {
  authHeader,
  options,
  get,
  post,
  patch,
  put,
  del,
};

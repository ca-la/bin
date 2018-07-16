'use strict';

const fetch = require('node-fetch');
const { baseUrl } = require('./boot');

function parseResponse(res) {
  const contentType = res.headers.get('Content-Type');
  if (contentType && contentType.indexOf('application/json') === 0) {
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
    Authorization: `Token ${sessionId}`
  };
}

function get(url, opts = {}) {
  const fullUrl = baseUrl + url;

  const headers = Object.assign({
    Accept: 'application/json'
  }, opts.headers);

  const options = Object.assign({}, opts, {
    method: 'get',
    headers
  });

  return fetch(fullUrl, options).then(parseResponse);
}

function post(url, opts = {}) {
  const fullUrl = baseUrl + url;

  const headers = Object.assign({
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }, opts.headers);

  let body = null;

  if (opts.body) {
    body = JSON.stringify(opts.body);
  }

  const options = Object.assign({}, opts, {
    method: 'post',
    headers,
    body
  });

  return fetch(fullUrl, options).then(parseResponse);
}

function patch(url, opts = {}) {
  const fullUrl = baseUrl + url;

  const headers = Object.assign({
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }, opts.headers);

  let body = null;

  if (opts.body) {
    body = JSON.stringify(opts.body);
  }

  const options = Object.assign({}, opts, {
    method: 'patch',
    headers,
    body
  });

  return fetch(fullUrl, options).then(parseResponse);
}

function put(url, opts = {}) {
  const fullUrl = baseUrl + url;

  const headers = Object.assign({
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }, opts.headers);

  let body = null;

  if (opts.body) {
    body = JSON.stringify(opts.body);
  }

  const options = Object.assign({}, opts, {
    method: 'put',
    headers,
    body
  });

  return fetch(fullUrl, options).then(parseResponse);
}

function del(url, opts = {}) {
  const fullUrl = baseUrl + url;

  const headers = Object.assign({
    Accept: 'application/json'
  }, opts.headers);

  const options = Object.assign({}, opts, {
    method: 'delete',
    headers
  });

  return fetch(fullUrl, options).then(parseResponse);
}

module.exports = {
  authHeader,
  get,
  post,
  patch,
  put,
  del
};

import fetch, { RequestInit } from 'node-fetch';

import serializeRequestBody from './serialize-request-body';
import Logger = require('../logger');
import { STRIPE_SECRET_KEY } from '../../config';
import InvalidPaymentError = require('../../errors/invalid-payment');
import StripeError = require('../../errors/stripe');

const STRIPE_API_BASE = 'https://api.stripe.com/v1';

interface RequestOptions {
  method: 'post' | 'get';
  path: string;
  data: object;
  idempotencyKey?: string;
  apiBase?: string;
}

const CREDENTIALS = Buffer.from(`${STRIPE_SECRET_KEY}:`).toString('base64');

interface WithHeaders {
  headers: {
    [key: string]: string;
  };
}

export default async function makeRequest<ResponseType = object>(
  requestOptions: RequestOptions
): Promise<ResponseType> {
  const { method, path, data, idempotencyKey, apiBase } = requestOptions;
  if (!method || !path) {
    throw new Error('Missing required values');
  }

  const base = apiBase || STRIPE_API_BASE;
  const url = `${base}${path}`;

  const options: RequestInit & WithHeaders = {
    method,
    headers: {
      Authorization: `Basic ${CREDENTIALS}`
    }
  };

  if (data) {
    options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    options.body = serializeRequestBody(data);
  }

  if (idempotencyKey) {
    options.headers['Idempotency-Key'] = idempotencyKey;
  }

  const response = await fetch(url, options);
  const contentType = response.headers.get('content-type');
  const isJson = contentType && /application\/.*json/.test(contentType);

  if (!isJson) {
    const text = await response.text();
    Logger.logServerError('Stripe request: ', method, url);
    Logger.logServerError('Stripe response: ', response.status, text);
    throw new Error(`Unexpected Stripe response type: ${contentType}`);
  }

  const json = await response.json();

  switch (response.status) {
    case 200:
      return json;
    case 402:
      throw new InvalidPaymentError(
        (json.error && json.error.message) || 'Your payment method was declined'
      );
    default:
      throw new StripeError(json.error);
  }
}

'use strict';

const STRIPE_API_BASE = 'https://api.stripe.com/v1';

async function makeRequest(method, path, data) {
  const url = `${STRIPE_API_BASE}/${path}`;

  const options = {
    method,
    headers: {
      Authorization: `Basic ${apiKey}`
    }
  };

  if (data) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  const contentType = response.headers.get('content-type');
  const isJson = /application\/.*json/.test(contentType);

  if (!isJson) {
    const text = await response.text();
    Logger.logServerError('Stripe request: ', method, url);
    Logger.logServerError('Stripe response: ', response.status, text);
    throw new Error(`Unexpected Stripe response type: ${contentType}`);
  }

  const json = await response.json();
  return json;
}

async function charge() {

}

import { fetch } from '../fetch';
import { IMGIX_API_KEY } from '../../config';
import { logServerError } from '../logger';

const API_BASE = 'https://api.imgix.com/v2';

type Method = 'POST' | 'PUT' | 'GET' | 'PATCH' | 'DELETE';

const IMGIX_CREDENTIALS = Buffer.from(`${IMGIX_API_KEY}:`).toString('base64');

async function makeRequest(
  method: Method,
  path: string,
  payload?: object
): Promise<void | object> {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${IMGIX_CREDENTIALS}`
    },
    body: payload ? JSON.stringify(payload) : undefined
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType && /application\/.*json/.test(contentType);

  if (!isJson) {
    const text = await response.text();
    logServerError('Imgix request: ', method, path);
    logServerError('Imgix response: ', response.status, text);
    throw new Error(`Unexpected Imgix response type: ${contentType}`);
  }

  const json = await response.json();

  if (response.status < 200 || response.status >= 300) {
    logServerError('Imgix response:', json);
    throw new Error(`Unexpected Imgix response code: ${response.status}`);
  }

  return json;
}

export async function purgeImage(imageUrl: string): Promise<void> {
  await makeRequest('POST', '/image/purger', {
    url: imageUrl
  });
}

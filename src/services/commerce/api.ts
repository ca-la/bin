import fetch, { RequestInit, Response } from "node-fetch";
import { COMMERCE_HOST, COMMERCE_TOKEN } from "../../config";

export async function fetchCommerce(
  path: string,
  init?: RequestInit
): Promise<Response> {
  return fetch(`${COMMERCE_HOST}/api/${path}`, {
    ...init,
    headers: {
      ...(init && init.headers),
      Authorization: `Token ${COMMERCE_TOKEN}`,
    },
  });
}

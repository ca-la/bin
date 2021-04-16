import { fetch } from "../fetch";
import { IMGIX_PURGE_API_KEY, USER_UPLOADS_IMGIX_URL } from "../../config";
import { logServerError } from "../logger";

const API_BASE = "https://api.imgix.com/api/v1";

type Method = "POST" | "PUT" | "GET" | "PATCH" | "DELETE";

async function makeRequest<T extends object>(options: {
  method: Method;
  base: string;
  path: string;
  payload?: object;
  headers?: Record<string, string>;
}): Promise<T> {
  const { method, base, path, payload, headers } = options;
  const response = await fetch(`${base}${path}`, {
    method,
    headers,
    body: payload ? JSON.stringify(payload) : undefined,
  });

  const contentType = response.headers.get("content-type");
  const isJson = contentType && /application\/.*json/.test(contentType);

  if (!isJson) {
    const text = await response.text();
    logServerError("Imgix request: ", method, path);
    logServerError("Imgix response: ", response.status, text);
    throw new Error(`Unexpected Imgix response type: ${contentType}`);
  }

  const json = await response.json();

  if (response.status < 200 || response.status >= 300) {
    logServerError("Imgix response:", json);
    throw new Error(`Unexpected Imgix response code: ${response.status}`);
  }

  return json;
}

async function makeApiRequest(method: Method, path: string, payload?: object) {
  return makeRequest({
    method,
    base: API_BASE,
    path,
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${IMGIX_PURGE_API_KEY}`,
    },
    payload,
  });
}

export async function purgeImage(imageUrl: string): Promise<void> {
  await makeApiRequest("POST", "/purge", {
    data: {
      attributes: {
        url: imageUrl,
      },
      type: "purges",
    },
  });
}

interface MetadataResponse {
  PDF: {
    PageCount: number;
  };
}

export async function getPageCount(assetId: string): Promise<number> {
  const metadata = await makeRequest<
    MetadataResponse | Partial<MetadataResponse>
  >({
    method: "GET",
    base: USER_UPLOADS_IMGIX_URL,
    path: `/${assetId}?fm=json`,
  });

  if (!metadata.PDF || !metadata.PDF.PageCount) {
    throw new Error(`Asset ${assetId} did not return a valid page count`);
  }

  return metadata.PDF.PageCount;
}

import { fetch } from "../fetch";
import { IMGIX_PURGE_API_KEY, USER_UPLOADS_IMGIX_URL } from "../../config";
import { logServerError, logWarning } from "../logger";
import filterError = require("../filter-error");

const API_BASE = "https://api.imgix.com/api/v1";

type Method = "POST" | "PUT" | "GET" | "PATCH" | "DELETE";

export class ImgixResponseTypeError extends Error {
  public status: number;
  public text: string;

  constructor({
    message,
    status,
    text,
  }: {
    message: string;
    status: number;
    text: string;
  }) {
    super(message);
    this.message = message;
    this.status = status;
    this.text = text;
    this.name = "ImgixResponseTypeError";
  }
}

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
    const err = new ImgixResponseTypeError({
      message: `Unexpected Imgix response type: ${contentType}`,
      status: response.status,
      text,
    });
    throw err;
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
  }).catch(
    filterError(ImgixResponseTypeError, (err: ImgixResponseTypeError) => {
      logServerError("Imgix request: ", method, path);
      logServerError("Imgix response: ", err.status, err.text);
      throw err;
    })
  );
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
  }).catch(
    filterError(ImgixResponseTypeError, (err: ImgixResponseTypeError) => {
      // Not logging the body, as imgix `fm=json` requests can return the entire
      // asset payload in some cases
      logWarning(`Asset ID: ${assetId}. Status: ${err.status}`);
      throw err;
    })
  );

  if (!metadata.PDF || !metadata.PDF.PageCount) {
    throw new Error(`Asset ${assetId} did not return a valid page count`);
  }

  return metadata.PDF.PageCount;
}

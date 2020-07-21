import { RequestInit } from "node-fetch";

import { fetch } from "../fetch";
import { ResponseContentTypeError } from "./error";

interface FetchOptions extends RequestInit {
  headers: Record<string, string>;
}

interface GetRequest {
  method: "get";
  path: string;
  additionalHeaders?: Record<string, string>;
  apiBase?: string;
}

interface PostRequest {
  method: "post";
  path: string;
  data?: object;
  additionalHeaders?: Record<string, string>;
  apiBase?: string;
}

export type RequestOptions = GetRequest | PostRequest;

type Fetcher<T> = (options: RequestOptions) => Promise<[number, T]>;

interface FetcherOptions {
  apiBase: string;
  headerBase: Record<string, string>;
  serializer: (input: any) => RequestInit["body"];
}

export function getFetcher(fetcherOptions: FetcherOptions): Fetcher<any> {
  return async ({
    additionalHeaders = {},
    apiBase = fetcherOptions.apiBase,
    ...requestOptions
  }: RequestOptions) => {
    const { path, method } = requestOptions;
    const url = `${apiBase}${path}`;

    const options: FetchOptions = {
      method,
      headers: {
        ...fetcherOptions.headerBase,
        ...additionalHeaders,
      },
    };

    if (requestOptions.method === "post" && requestOptions.data) {
      options.body = fetcherOptions.serializer(requestOptions.data);
    }

    const response = await fetch(url, options);
    const contentType = response.headers.get("content-type");
    const isJson = contentType && /application\/.*json/.test(contentType);

    if (!isJson) {
      throw new ResponseContentTypeError(
        `Unexpected content type: ${contentType}`,
        { method, url, status: response.status, text: await response.text() }
      );
    }

    return [response.status, await response.json()];
  };
}

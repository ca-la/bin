interface ErrorContext {
  method: "get" | "post";
  url: string;
  status: number;
  text: string;
}
export class ResponseContentTypeError extends Error {
  constructor(message: string, { status, method, url, text }: ErrorContext) {
    super(message);
    this.message = `${message}
Request: ${method} ${url}
Status code: ${status}
Response body:
${text}`;
    this.name = "ResponseContentTypeError";
  }
}

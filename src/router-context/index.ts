import { Request, Context, DefaultState } from "koa";

interface UnknownRequest extends Request {
  body: unknown;
  query: unknown;
}

export interface StrictContext<ResponseBodyT = never> extends Context {
  [key: string]: unknown;
  request: UnknownRequest;
  state: DefaultState;
  params: unknown;
  body: ResponseBodyT;
  query: unknown;
}

declare module 'koa' {
  import { IncomingMessage, Server, ServerResponse } from 'http';
  import { EventEmitter } from 'events';
  import httpAssert = require('http-assert');

  function Koa(): Koa.Application;

  export = Koa;

  interface RequestState {
    userId: string;
  }

  namespace Koa {
    class Application extends EventEmitter {
      public use(middleware: any): this;
      public listen(port: string | number): Server;
    }

    namespace Application {
      interface Request {
        body?: object; // from koa-router
      }

      interface ContextDelegatedResponse {
        status: number;
        message: string;
        body: any;
        length: number;
        type: string;
        lastModified: Date;
        etag: string;
        headerSent: boolean;
        writable: boolean;

        attachment(filename: string): void;
        redirect(url: string, alt?: string): void;
        remove(field: string): void;
        vary(field: string): void;
        set(field: { [key: string]: string }): void;
        set(field: string, val: string | string[]): void;
        append(field: string, val: string | string[]): void;
      }

      interface Response extends ContextDelegatedResponse {
        is(types: string | string[]): string | false;
        get(field: string): string;
        set(field: string | object, value?: string | string[]): void;
        inspect(): object;
        toJSON(): object;
      }

      interface Context extends ContextDelegatedResponse {
        params: any; // from koa-router
        request: Request;
        response: Response;
        req: IncomingMessage;
        res: ServerResponse;
        state: RequestState;

        assert: typeof httpAssert;
        throw(message: string, code?: number, properties?: object): never;
        throw(status: number): never;
        throw(...properties: (number | string | object)[]): never;
      }
    }
  }
}

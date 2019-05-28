declare module 'koa' {
  import { IncomingMessage, Server, ServerResponse } from 'http';
  import { EventEmitter } from 'events';
  import httpAssert = require('http-assert');
  function Koa(): Koa.Application;

  export = Koa;

  interface RequestState {
    userId: string;
    role: string;
    collaborator?: import('../../components/collaborators/domain-objects/collaborator').default;
    collection?: import('../../domain-objects/collection').default;
    design?: import('../../domain-objects/product-design');
    permissions?: import('../../services/get-permissions').Permissions;
  }

  namespace Koa {
    class Application extends EventEmitter {
      public use(middleware: any): this;
      public listen(port: string | number): Server;
    }

    type Middleware = (ctx: Koa.Application.Context, next: () => void) => void;

    namespace Application {
      interface Request<T> {
        body: object & T; // from middleware/json-body
        method: string;
      }

      interface Query {
        [key: string]: string | undefined;
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
        redirect(url: string, alt?: string | number): void;
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

      interface Context<T = object> extends ContextDelegatedResponse {
        params: any; // from koa-router
        request: Request<T>;
        response: Response;
        query: Query;
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

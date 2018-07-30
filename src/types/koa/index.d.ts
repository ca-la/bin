declare module 'koa' {
  import { Server } from 'http';
  function Koa(): Koa.Application;

  namespace Koa {
    export interface Application {
      use(middleware: any): this;
      listen(port: string | number): Server;
    }
  }

  namespace Application {
  }

  export = Koa;
}

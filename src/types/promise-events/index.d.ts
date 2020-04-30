declare module 'promise-events' {
  export default class AsyncEmitter {
    public emit<T = void>(event: string | symbol, ...args: any[]): Promise<T>;
    public on<T = void>(
      event: string | symbol,
      handler: (...args: any[]) => Promise<T>
    ): void;
  }
}

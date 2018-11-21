declare module 'pg-rethrow' {
  class ForeignKeyViolation {
    public constraint: string;
  }

  function Rethrow(err: object | Error): never;

  namespace Rethrow {
    export interface Errors {
      ForeignKeyViolation: ForeignKeyViolation;
    }

    export const ERRORS: Errors;
  }

  export = Rethrow;
}

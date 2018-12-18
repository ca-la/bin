declare module 'pg-rethrow' {
  interface ForeignKeyViolation {
    constraint: string;
  }
  interface UniqueViolation {
    constraint: string;
  }

  function Rethrow(err: object | Error): never;

  namespace Rethrow {
    export interface Errors {
      ForeignKeyViolation: ForeignKeyViolation;
      UniqueViolation: UniqueViolation;
    }

    export const ERRORS: Errors;
  }

  export = Rethrow;
}

declare module 'pg-rethrow' {
  interface ForeignKeyViolation {
    constraint: string;
  }
  interface UniqueViolation {
    constraint: string;
  }
  interface InvalidRegularExpression extends Error {}

  function Rethrow(err: object | Error): never;

  namespace Rethrow {
    export interface Errors {
      ForeignKeyViolation: ForeignKeyViolation;
      UniqueViolation: UniqueViolation;
      InvalidRegularExpression: InvalidRegularExpression;
    }

    export const ERRORS: Errors;
  }

  export = Rethrow;
}

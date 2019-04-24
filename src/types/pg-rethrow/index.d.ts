declare module 'pg-rethrow' {
  interface ForeignKeyViolation {
    constraint: string;
  }
  interface UniqueViolation {
    constraint: string;
  }
  interface InvalidRegularExpression extends Error {}
  interface InvalidTextRepresentation extends Error {}

  function Rethrow(err: object | Error): never;

  namespace Rethrow {
    export interface Errors {
      ForeignKeyViolation: ForeignKeyViolation;
      UniqueViolation: UniqueViolation;
      InvalidRegularExpression: InvalidRegularExpression;
      InvalidTextRepresentation: InvalidTextRepresentation;
    }

    export const ERRORS: Errors;
  }

  export = Rethrow;
}

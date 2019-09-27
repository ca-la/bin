declare module 'pg-rethrow' {
  export = Rethrow;

  function Rethrow(err: object | Error): never;

  namespace Rethrow {
    const ForeignKeyViolation: { constraint: string } & ErrorConstructor;
    const UniqueViolation: { constraint: string } & ErrorConstructor;
    const InvalidRegularExpression: ErrorConstructor;
    const InvalidTextRepresentation: ErrorConstructor;

    export interface Errors {
      ForeignKeyViolation: typeof ForeignKeyViolation;
      UniqueViolation: typeof UniqueViolation;
      InvalidRegularExpression: typeof InvalidRegularExpression;
      InvalidTextRepresentation: typeof InvalidTextRepresentation;
    }

    export const ERRORS: Errors;
  }
}

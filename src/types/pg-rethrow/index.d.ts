/* tslint:disable:max-classes-per-file */
declare module "pg-rethrow" {
  export = Rethrow;

  function Rethrow(err: object | Error): never;

  namespace Rethrow.ERRORS {
    class ForeignKeyViolation extends Error {
      public constraint: string;
    }

    class UniqueViolation extends Error {
      public constraint: string;
      public detail: string;
    }

    class InvalidRegularExpression extends Error {}

    class InvalidTextRepresentation extends Error {}

    class CheckViolation extends Error {
      public constraint: string;
    }
  }
}

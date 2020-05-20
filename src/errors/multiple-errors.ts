export default class MultipleErrors<ErrorType extends Error> extends Error {
  public errors: ErrorType[];

  constructor(errors: ErrorType[]) {
    const errorStrings = errors.map((err: ErrorType) => err.message);
    const message = `One or more errors has occurred: ${errorStrings.join(
      ", "
    )}`;
    super(message);
    this.message = message;
    this.errors = errors;
    this.name = "MultipleErrors";
  }
}

export class DuplicateAcceptRejectError extends Error {
  constructor(message: string) {
    super(message);
    this.message = message;
    this.name = "DuplicateAcceptRejectError";
  }
}

export default class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.message = message;
    this.name = "ConflictError";
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

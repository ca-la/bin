export default class InsufficientPlanError extends Error {
  constructor(message: string) {
    super(message);
    this.message = message;
    this.name = "InsufficientPlanError";
    Object.setPrototypeOf(this, InsufficientPlanError.prototype);
  }
}

export default class ThirdPartyCallError extends Error {
  public code: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.message = message;
    this.code = statusCode;
    this.name = "ThirdPartyCallError";
    Object.setPrototypeOf(this, ThirdPartyCallError.prototype);
  }
}

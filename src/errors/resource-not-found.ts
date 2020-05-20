export default class ResourceNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.message = message;
    this.name = "ResourceNotFoundError";
  }
}

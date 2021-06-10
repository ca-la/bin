declare class InvalidDataError extends Error {
  public status: number;
  public code: symbol | number;
  public message: string;
  constructor(msg: string, code?: symbol | number);
}

export = InvalidDataError;

declare class InvalidDataError extends Error {
  constructor(msg: string, code?: symbol);
}

export = InvalidDataError;

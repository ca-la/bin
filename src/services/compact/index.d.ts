declare namespace Compact {
  function compact<T extends object = object>(obj: T): Partial<T>;
}

export = Compact.compact;

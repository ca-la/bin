interface BaseObject extends Object {
  createdBy: string;
}

export default function attachDefaults<T extends BaseObject>(request: T, userId: string): T {
  return Object.assign({}, request, { createdBy: userId });
}

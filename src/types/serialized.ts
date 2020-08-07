export type Serialized<T> = {
  [P in keyof T]: T[P] extends Date
    ? string
    : T[P] extends Date | null
    ? string | null
    : T[P] extends any[]
    ? Serialized<T[P]>
    : T[P] extends any[] | null
    ? Serialized<T[P]> | null
    : T[P] extends object
    ? Serialized<T[P]>
    : T[P];
};

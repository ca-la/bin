type Omit<T, K extends keyof T> = T extends any ? Pick<T, Exclude<keyof T, K>> : never;

type Uninserted<T extends { created_at: Date; }> = Omit<T, 'created_at'>;

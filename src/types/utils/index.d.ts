type Omit<T, K extends keyof T> = T extends any ? Pick<T, Exclude<keyof T, K>> : never;

interface WithCreatedDate {
  created_at?: Date;
  createdAt?: Date;
}

type Uninserted<T extends WithCreatedDate> = Omit<T, 'created_at' | 'createdAt'>;

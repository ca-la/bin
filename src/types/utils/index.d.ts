type Omit<T, K extends keyof T> = T extends any ? Pick<T, Exclude<keyof T, K>> : never;

interface WithCreatedDate {
  created_at?: Date;
  createdAt?: Date;
}

type Uninserted<T extends WithCreatedDate> = Omit<T, 'created_at' | 'createdAt'>;

type Unsaved<T extends { createdAt?: Date, id?: string, deletedAt?: Date | null }> =
  Omit<T, 'createdAt' | 'id' | 'deletedAt'>;

type MaybeUnsaved<T extends { createdAt?: Date, id?: string, deletedAt?: Date | null }> =
  Omit<T, 'createdAt' | 'id' | 'deletedAt'> & { id?: string };

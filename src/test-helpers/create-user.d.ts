export = createUser;

interface CreateUserOptions {
  withSession?: boolean;
  withAddress?: boolean;
  role?: string;
}

declare function createUser(
  options?: CreateUserOptions
): Promise<{ user: any; session: any; address: any }>;

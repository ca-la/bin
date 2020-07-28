interface WithCreatedDate {
  created_at?: Date | string;
  createdAt?: Date;
}

interface WithShortId {
  short_id?: string | null;
  shortId?: string | null;
}

type Uninserted<T extends WithCreatedDate> = Omit<
  T,
  "created_at" | "createdAt"
>;

type UninsertedWithoutShortId<T extends WithCreatedDate & WithShortId> = Omit<
  T,
  "created_at" | "createdAt" | "short_id" | "shortId"
>;

type Unsaved<
  T extends { createdAt?: Date; id?: string; deletedAt?: Date | null }
> = Omit<T, "createdAt" | "id" | "deletedAt">;

type MaybeUnsaved<
  T extends { createdAt?: Date; id?: string; deletedAt?: Date | null }
> = Omit<T, "createdAt" | "id" | "deletedAt"> & { id?: string };

interface WithRouter {
  params: {
    [key: string]: string;
  };
}

interface WithRouterStrict<T> {
  params: T;
}

interface WithJsonBody<T extends object | any[]> {
  request: import("koa").Request & {
    body: T;
  };
}

interface AuthedState {
  userId: string;
  role: string;
  token: string;
}

interface PermittedState {
  permissions: import("../../services/get-permissions").Permissions;
}

type AuthedContext<
  BodyT = {},
  StateT = AuthedState,
  Params = null
> = import("koa").ParameterizedContext<
  AuthedState & StateT,
  (Params extends null ? WithRouter : WithRouterStrict<Params>) &
    WithJsonBody<BodyT>
>;

type PublicContext<
  BodyT = {},
  StateT = {}
> = import("koa").ParameterizedContext<
  StateT,
  WithRouter & WithJsonBody<BodyT>
>;

type TrxContext<T extends AuthedContext> = T & {
  state: T["state"] & { trx: import("knex").Transaction };
};

interface PermissionsKoaState {
  permissions: import("../../services/get-permissions").Permissions;
}

interface CollectionsKoaState {
  collection: import("../../components/collections/domain-object").default;
}

interface CollaboratorKoaState {
  collaborator: import("../../components/collaborators/types").default;
}

type UnknownObject = Record<string, any>;

type EmptyObject = Record<string, never>;

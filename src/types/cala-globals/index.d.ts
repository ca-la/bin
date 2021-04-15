interface WithInitialDates {
  created_at?: Date | string;
  createdAt?: Date;
  updated_at?: Date | string;
  updatedAt?: Date;
}

interface WithShortId {
  short_id?: string | null;
  shortId?: string | null;
}

type Uninserted<T extends WithInitialDates> = Omit<
  T,
  "created_at" | "createdAt" | "updated_at" | "updatedAt"
>;

type UninsertedWithoutShortId<T extends WithInitialDates & WithShortId> = Omit<
  T,
  "created_at" | "createdAt" | "short_id" | "shortId"
>;

interface ModelWithMeta {
  createdAt?: Date;
  id?: string;
  deletedAt?: Date | null;
  updatedAt?: Date;
}

type Unsaved<T extends ModelWithMeta> = Omit<
  T,
  "createdAt" | "id" | "deletedAt" | "updatedAt"
>;

type MaybeUnsaved<T extends ModelWithMeta> = Omit<
  T,
  "createdAt" | "id" | "deletedAt" | "updatedAt"
> & { id?: string };

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

type WithResponseBody<C extends import("koa").ParameterizedContext, B> = Omit<
  C,
  "body"
> & {
  body: B;
};

interface PublicState {
  tracking: import("../../middleware/tracking").TrackingEvent[];
  trackingId: string;
}

interface AuthedState extends PublicState {
  userId: string;
  role: string;
  token: string;
}

interface PermittedState {
  permissions: import("../../services/get-permissions").Permissions;
}

type AuthedContext<
  BodyT = {},
  StateT = {},
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
  PublicState & StateT,
  WithRouter & WithJsonBody<BodyT>
>;

type TrxContext<T extends import("koa").ParameterizedContext> = T & {
  state: T["state"] & { trx: import("knex").Transaction };
};

interface SafeBodyContext<BodyT = unknown> {
  state: { safeBody: BodyT };
}

interface TransactionContext {
  state: { trx: import("knex").Transaction };
}

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

declare module "http-assert" {
  function assert(
    value: any,
    status?: number,
    msg?: string,
    opts?: {}
  ): asserts value;
  function assert(value: any, status?: number, opts?: {}): asserts value;

  export = assert;
}

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
  'created_at' | 'createdAt'
>;

type UninsertedWithoutShortId<T extends WithCreatedDate & WithShortId> = Omit<
  T,
  'created_at' | 'createdAt' | 'short_id' | 'shortId'
>;

type Unsaved<
  T extends { createdAt?: Date; id?: string; deletedAt?: Date | null }
> = Omit<T, 'createdAt' | 'id' | 'deletedAt'>;

type MaybeUnsaved<
  T extends { createdAt?: Date; id?: string; deletedAt?: Date | null }
> = Omit<T, 'createdAt' | 'id' | 'deletedAt'> & { id?: string };

interface WithRouter {
  params: {
    [key: string]: string;
  };
}

interface WithJsonBody<T extends object | any[]> {
  request: import('koa').Request & {
    body: T;
  };
}

interface AuthedKoaState {
  userId: string;
  role: string;
  token: string;
}

type AuthedContext<
  BodyT = {},
  StateT = AuthedKoaState
> = import('koa').ParameterizedContext<
  AuthedKoaState & StateT,
  WithRouter & WithJsonBody<BodyT>
>;

type PublicContext<
  BodyT = {},
  StateT = {}
> = import('koa').ParameterizedContext<
  StateT,
  WithRouter & WithJsonBody<BodyT>
>;

interface PermissionsKoaState {
  permissions: import('../../services/get-permissions').Permissions;
}

interface CollectionsKoaState {
  collection: import('../../components/collections/domain-object').default;
}

interface CollaboratorKoaState {
  collaborator: import('../../components/collaborators/domain-objects/collaborator').default;
}

import * as Knex from 'knex';

export interface EventBase {
  type: string;
  domain: string;
  trx: Knex.Transaction;
}

export interface DaoUpdating<Model, domain extends string> extends EventBase {
  type: 'dao.updating';
  domain: domain;
  before: Model;
  patch: Partial<Model>;
}
export interface DaoUpdated<Model, domain extends string> extends EventBase {
  type: 'dao.updated';
  domain: domain;
  before: Model;
  updated: Model;
}

export interface DaoCreated<Model, domain extends string> extends EventBase {
  type: 'dao.created';
  domain: domain;
  created: Model;
}

export interface RouteUpdated<Model, domain extends string> extends EventBase {
  type: 'route.updated';
  domain: domain;
  actorId: string;
  before: Model;
  updated: Model;
}

export type Event<Model, domain extends string> =
  | DaoUpdated<Model, domain>
  | DaoUpdating<Model, domain>
  | RouteUpdated<Model, domain>;

export type Handler<T extends EventBase> = (event: T) => Promise<any>;

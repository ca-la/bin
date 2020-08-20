import * as Knex from "knex";

export interface EventBase {
  type: string;
  domain: string;
  trx: Knex.Transaction;
}

export interface DaoUpdating<Model, domain extends string> extends EventBase {
  type: "dao.updating";
  domain: domain;
  before: Model;
  patch: Partial<Model>;
}

export interface DaoUpdated<Model, domain extends string> extends EventBase {
  type: "dao.updated";
  domain: domain;
  before: Model;
  updated: Model;
}

export interface DaoCreated<Model, domain extends string> extends EventBase {
  type: "dao.created";
  domain: domain;
  created: Model;
}

export interface RouteUpdated<Model, domain extends string> extends EventBase {
  type: "route.updated";
  domain: domain;
  actorId: string;
  before: Model;
  updated: Model;
}

export interface RouteCreated<Model, domain extends string> extends EventBase {
  type: "route.created";
  domain: domain;
  actorId: string;
  created: Model;
}

export type Event<Model, domain extends string> =
  | DaoCreated<Model, domain>
  | DaoUpdated<Model, domain>
  | DaoUpdating<Model, domain>
  | RouteUpdated<Model, domain>
  | RouteCreated<Model, domain>;

export type Handler<
  Model,
  Domain extends string,
  T extends Event<Model, Domain>
> = (event: T) => Promise<any>;

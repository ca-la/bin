import { Transaction, QueryBuilder } from "knex";
import { Middleware } from "koa-router";
import DataAdapter from "../data-adapter";
import {
  NotificationsLayer,
  NotificationsLayerSchema,
} from "./cala-notifications";

export type HTTPMethod = "get" | "put" | "patch" | "post" | "delete";
export type CalaUrlRoutes = Partial<Record<HTTPMethod, Middleware[]>>;

export interface CalaRoutes {
  [url: string]: CalaUrlRoutes;
}

export interface CalaRouter {
  prefix: string;
  routes: CalaRoutes;
}

export interface CalaAdapter<Model, ModelRow extends object> {
  dataAdapter: DataAdapter<ModelRow, Model>;
  isRow: (item: any) => item is ModelRow;
  isModel: (item: any) => item is Model;
  toDb: (item: Model) => ModelRow;
  toDbArray: (item: Model[]) => ModelRow[];
  forInsertion: (item: Model) => Uninserted<ModelRow>;
  forInsertionArray: (item: Model[]) => Uninserted<ModelRow>[];
  toDbPartial: (item: Partial<Model>) => Partial<ModelRow>;
  fromDb: (item: ModelRow) => Model;
  fromDbArray: (items: ModelRow[]) => Model[];
}

export interface UpdateResult<Model> {
  before: Model;
  updated: Model;
}

export interface CalaDao<Model> {
  find: (
    trx: Transaction,
    filter: Partial<Model>,
    modifier?: (query: QueryBuilder) => QueryBuilder
  ) => Promise<Model[]>;
  findOne: (
    trx: Transaction,
    filter: Partial<Model>,
    modifier?: (query: QueryBuilder) => QueryBuilder
  ) => Promise<Model | null>;
  findById: (trx: Transaction, id: string) => Promise<Model | null>;
  update: (
    trx: Transaction,
    id: string,
    patch: Partial<Model>
  ) => Promise<UpdateResult<Model>>;
  create: (trx: Transaction, blank: Model) => Promise<Model>;
  createAll: (trx: Transaction, blanks: Model[]) => Promise<Model[]>;
}

export { NotificationsLayer };

export interface CalaComponent<
  Model extends object,
  ModelRow extends object,
  NotificationSchema extends NotificationsLayerSchema = {}
> {
  adapter?: CalaAdapter<Model, ModelRow>;
  dao?: CalaDao<Model>;
  router?: CalaRouter;
  listeners?: void;
  notifications: NotificationsLayer<NotificationSchema>;
}

import { Middleware } from "koa-router";
import { Transaction } from "knex";
import { difference, omit, pick } from "lodash";
import { CalaRouter, CalaRoutes, CalaDao } from "./types";

import db from "../db";
import useTransaction from "../../middleware/use-transaction";
import ResourceNotFoundError from "../../errors/resource-not-found";
import { emit } from "../pubsub";
import filterError from "../../services/filter-error";
import { RouteCreated, RouteUpdated } from "../pubsub/cala-events";
import InvalidDataError from "../../errors/invalid-data";

type StandardRoute = "find" | "update" | "create";

interface SpecificOptions<Model> {
  update: {
    shouldReturnNoContent?: boolean;
    allowedAttributes?: (keyof Model)[];
  };
  find: {
    allowedFilterAttributes?: (keyof Model)[];
  };
  create: {
    getModelFromBody: (
      trx: Transaction,
      model: Record<string, any>
    ) => Promise<Model>;
  };
}

interface RouterOptions<Model> {
  pickRoutes?: StandardRoute[];
  routeOptions?: Partial<
    {
      [key in StandardRoute]: {
        middleware: Middleware[];
      } & SpecificOptions<Model>[key];
    }
  >;
}

export function buildRouter<Model>(
  domain: string,
  prefix: string,
  dao: CalaDao<Model>,
  { pickRoutes = [], routeOptions = {} }: RouterOptions<Model>
): CalaRouter {
  return {
    prefix,
    routes: pickRoutes.reduce<CalaRoutes>(
      (routes: CalaRoutes, routeName: string) => {
        switch (routeName) {
          case "find": {
            const allowedFilterAttributes =
              (routeOptions.find &&
                routeOptions.find.allowedFilterAttributes) ||
              [];
            const isFilter = (filter: any): filter is Partial<Model> => {
              return (
                difference(
                  Object.keys(filter),
                  (allowedFilterAttributes || []) as string[]
                ).length === 0
              );
            };
            if (!routes["/"]) {
              routes["/"] = {};
            }
            routes["/"].get = [
              ...((routeOptions.find && routeOptions.find.middleware) || []),
              function* find(
                this: AuthedContext<{}, PermittedState>
              ): Iterator<any, any, any> {
                if (!isFilter(this.query)) {
                  this.throw(400, "Disallowed filter properties");
                }
                const found = yield dao.find(db, this.query);

                this.body = found;
                this.status = 200;
              },
            ];
            break;
          }
          case "create": {
            if (!routes["/"]) {
              routes["/"] = {};
            }
            routes["/"].post = [
              useTransaction,
              ...((routeOptions.create && routeOptions.create.middleware) ||
                []),
              function* create(
                this: TrxContext<AuthedContext<Model, PermittedState>>
              ): Iterator<any, any, any> {
                const { trx, userId: actorId } = this.state;
                const { body } = this.request;

                let toCreate = body;
                if (routeOptions.create) {
                  toCreate = yield routeOptions.create
                    .getModelFromBody(trx, body)
                    .catch(
                      filterError(
                        InvalidDataError,
                        (error: InvalidDataError) => {
                          this.throw(400, error.message);
                        }
                      )
                    )
                    .catch(
                      filterError(
                        ResourceNotFoundError,
                        (error: ResourceNotFoundError) => {
                          this.throw(404, error.message);
                        }
                      )
                    );
                }

                const created = yield dao.create(trx, toCreate as Model);
                yield emit<Model, RouteCreated<Model, typeof domain>>({
                  type: "route.created",
                  domain,
                  actorId,
                  trx,
                  created,
                });

                this.status = 201;
                this.body = created;
              },
            ];
            break;
          }
          case "update":
            if (!routes["/:id"]) {
              routes["/:id"] = {};
            }
            routes["/:id"].patch = [
              useTransaction,
              ...((routeOptions.update && routeOptions.update.middleware) ||
                []),
              function* update(
                this: TrxContext<AuthedContext<Partial<Model>, PermittedState>>
              ): Iterator<any, any, any> {
                const { trx, userId: actorId } = this.state;
                const { id } = this.params;

                const allowedAttributes =
                  (routeOptions.update &&
                    routeOptions.update.allowedAttributes) ||
                  [];
                const patch = pick(this.request.body, allowedAttributes);
                if (Object.keys(patch).length === 0) {
                  this.throw(400, "No valid keys to update");
                }

                const restKeys = Object.keys(
                  omit(this.request.body, allowedAttributes)
                );
                if (restKeys.length > 0) {
                  this.throw(
                    400,
                    `Keys ${restKeys.join(", ")} are not allowed`
                  );
                }
                const { before, updated } = yield dao
                  .update(trx, id, patch)
                  .catch(
                    filterError(
                      ResourceNotFoundError,
                      (err: ResourceNotFoundError) => {
                        this.throw(404, err.message);
                      }
                    )
                  );
                yield emit<Model, RouteUpdated<Model, typeof domain>>({
                  type: "route.updated",
                  domain,
                  actorId,
                  trx,
                  before,
                  updated,
                });

                if (
                  routeOptions.update &&
                  routeOptions.update.shouldReturnNoContent
                ) {
                  this.status = 204;
                } else {
                  this.status = 200;
                  this.body = updated;
                }
              },
            ];
            break;
        }
        return routes;
      },
      {}
    ),
  };
}

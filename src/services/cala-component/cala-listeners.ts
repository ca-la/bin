import {
  DaoCreated,
  DaoUpdated,
  DaoUpdating,
  RouteUpdated,
  Handler,
  RouteCreated,
  RouteDeleted,
} from "../pubsub/cala-events";
import { listen } from "../pubsub";
import { getObjectDiff } from "../utils";
import { pick } from "lodash";

export type Listeners<Model, Domain extends string> = Partial<{
  "dao.created": Handler<Model, Domain, DaoCreated<Model, Domain>>;
  "dao.updating": Handler<Model, Domain, DaoUpdating<Model, Domain>>;
  "dao.updated.*": Partial<
    Record<keyof Model, Handler<Model, Domain, DaoUpdated<Model, Domain>>>
  >;
  "dao.updated": Handler<Model, Domain, DaoUpdated<Model, Domain>>;
  "route.updated.*": Partial<
    Record<keyof Model, Handler<Model, Domain, RouteUpdated<Model, Domain>>>
  >;
  "route.created": Handler<Model, Domain, RouteCreated<Model, Domain>>;
  "route.updated": Handler<Model, Domain, RouteUpdated<Model, Domain>>;
  "route.deleted": Handler<Model, Domain, RouteDeleted<Model, Domain>>;
}>;

export function buildListeners<Model, Domain extends string>(
  domain: Domain,
  listeners: Listeners<Model, Domain>
): void {
  if (listeners["dao.updating"]) {
    listen("dao.updating", domain, listeners["dao.updating"]);
  }
  if (listeners["dao.updated"]) {
    listen("dao.updated", domain, listeners["dao.updated"]);
  }
  listen("dao.updated", domain, async (event: DaoUpdated<Model, Domain>) => {
    const diffKeys = getObjectDiff<Model>(event.updated, event.before);
    if (listeners["dao.updated.*"] && diffKeys.length > 0) {
      const listenersToCall = pick(listeners["dao.updated.*"], diffKeys);
      for (const key of diffKeys) {
        const handler = listenersToCall[key];
        if (handler) {
          await handler(event);
        }
      }
    }
  });
  if (listeners["dao.created"]) {
    listen("dao.created", domain, listeners["dao.created"]);
  }
  if (listeners["route.created"]) {
    listen("route.created", domain, listeners["route.created"]);
  }
  if (listeners["route.updated"]) {
    listen("route.updated", domain, listeners["route.updated"]);
  }
  listen(
    "route.updated",
    domain,
    async (event: RouteUpdated<Model, Domain>) => {
      const diffKeys = getObjectDiff<Model>(event.updated, event.before);
      if (listeners["route.updated.*"] && diffKeys.length > 0) {
        const listenersToCall = pick(listeners["route.updated.*"], diffKeys);
        for (const key of diffKeys) {
          const handler = listenersToCall[key];
          if (handler) {
            await handler(event);
          }
        }
      }
    }
  );
  if (listeners["route.deleted"]) {
    listen("route.deleted", domain, listeners["route.deleted"]);
  }
}

import {
  DaoUpdated,
  DaoUpdating,
  RouteUpdated,
  Handler
} from '../pubsub/cala-events';
import { listen } from '../pubsub';
import { getObjectDiff } from '../utils';
import { pick } from 'lodash';

export type Listeners<Model, domain extends string> = Partial<{
  'dao.updating': Handler<DaoUpdating<Model, domain>>;
  'dao.updated.*': Partial<
    Record<keyof Model, Handler<DaoUpdated<Model, domain>>>
  >;
  'dao.updated': Handler<DaoUpdated<Model, domain>>;
  'route.updated.*': Partial<
    Record<keyof Model, Handler<RouteUpdated<Model, domain>>>
  >;
  'route.updated': Handler<RouteUpdated<Model, domain>>;
}>;

export function buildListeners<Model, domain extends string>(
  domain: string,
  listeners: Listeners<Model, domain>
): void {
  if (listeners['dao.updating']) {
    listen<DaoUpdating<Model, domain>>(
      'dao.updating',
      domain as domain,
      listeners['dao.updating']
    );
  }
  if (listeners['dao.updated']) {
    listen<DaoUpdated<Model, domain>>(
      'dao.updated',
      domain as domain,
      listeners['dao.updated']
    );
  }
  listen<DaoUpdated<Model, domain>>(
    'dao.updated',
    domain as domain,
    async (event: DaoUpdated<Model, domain>) => {
      const diffKeys = getObjectDiff<Model>(event.updated, event.before);
      if (listeners['dao.updated.*'] && diffKeys.length > 0) {
        const listenersToCall = pick(listeners['dao.updated.*'], diffKeys);
        for (const key of diffKeys) {
          const handler = listenersToCall[key];
          if (handler) {
            await handler(event);
          }
        }
      }
    }
  );
  if (listeners['route.updated']) {
    listen<RouteUpdated<Model, domain>>(
      'route.updated',
      domain as domain,
      listeners['route.updated']
    );
  }
  listen<RouteUpdated<Model, domain>>(
    'route.updated',
    domain as domain,
    async (event: RouteUpdated<Model, domain>) => {
      const diffKeys = getObjectDiff<Model>(event.updated, event.before);
      if (listeners['route.updated.*'] && diffKeys.length > 0) {
        const listenersToCall = pick(listeners['route.updated.*'], diffKeys);
        for (const key of diffKeys) {
          const handler = listenersToCall[key];
          if (handler) {
            await handler(event);
          }
        }
      }
    }
  );
}

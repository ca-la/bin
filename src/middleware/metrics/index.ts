import Koa from 'koa';

import * as Analytics from '../../services/analytics';

const UUID_REGEX = /[\w]{8}-[\w]{4}-[\w]{4}-[\w]{4}-[\w]{12}/g;

export default function* metrics(
  this: Koa.Context,
  next: () => any
): Iterator<any, any, any> {
  const start = Date.now();
  yield next;
  const ms = Date.now() - start;
  const path = this.originalUrl.replace(UUID_REGEX, ':id');

  Analytics.trackMetric(`Response Time: ${this.request.method} ${path}`, ms);
}

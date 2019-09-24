import * as Koa from 'koa';

import createFromDesignTemplate from '../../templates/services/create-from-design-template';
import filterError = require('../../../services/filter-error');
import ResourceNotFoundError from '../../../errors/resource-not-found';

export function* createFromTemplate(
  this: Koa.Application.Context
): AsyncIterableIterator<any> {
  const { userId } = this.state;
  const { templateDesignId } = this.params;
  const templateDesign = yield createFromDesignTemplate(
    templateDesignId,
    userId
  ).catch(
    filterError(ResourceNotFoundError, (err: ResourceNotFoundError) =>
      this.throw(400, err)
    )
  );

  this.body = templateDesign;
  this.status = 201;
}

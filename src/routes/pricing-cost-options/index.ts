import * as Router from 'koa-router';
import * as Koa from 'koa';

import * as PricingProcessesDAO from '../../dao/pricing-processes';
import * as PricingProductTypesDAO from '../../dao/pricing-product-types';
import * as PricingComplexitiesDAO from '../../dao/pricing-complexities';
import * as PricingMaterialCategoriesDAO from '../../dao/pricing-material-categories';
import requireAdmin = require('../../middleware/require-admin');
import {
  Complexity,
  MaterialCategory,
  Process,
  ProductType
} from '../../domain-objects/pricing';

const router = new Router();
// tslint:disable-next-line:typedef
const prop = (key: string) => (input: { [k: string]: any }): any => input[key];

function* getOptions(
  this: Koa.Application.Context
): AsyncIterableIterator<any> {
  const processes: Process[] = yield PricingProcessesDAO.findLatest();
  const types: {
    name: ProductType;
  }[] = yield PricingProductTypesDAO.findLatest();
  const complexities: {
    complexity: Complexity;
  }[] = yield PricingComplexitiesDAO.findLatest();
  const materialCategories: {
    category: MaterialCategory;
  }[] = yield PricingMaterialCategoriesDAO.findLatest();

  this.body = {
    complexities: complexities.map(prop('complexity')),
    materialCategories: materialCategories.map(prop('category')),
    processes,
    types: types.map(prop('name'))
  };
  this.status = 200;
}

router.get('/', requireAdmin, getOptions);

module.exports = router.routes();

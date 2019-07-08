import * as Router from 'koa-router';
import * as Koa from 'koa';

import * as ProductDesignVariantsDAO from '../../dao/product-design-variants';
import ProductDesignVariant from '../../domain-objects/product-design-variant';
import requireAuth = require('../../middleware/require-auth');
import {
  canAccessDesignInQuery,
  canEditDesign
} from '../../middleware/can-access-design';
import { hasProperties } from '../../services/require-properties';

const router = new Router();

interface ProductDesignVariantIO {
  colorName: string | null;
  createdAt?: Date;
  designId: string;
  id: string;
  position: number;
  sizeName: string | null;
  unitsToProduce: number;
}

function isProductDesignVariantIO(
  candidate: object
): candidate is ProductDesignVariantIO {
  return hasProperties(
    candidate,
    'colorName',
    'designId',
    'id',
    'position',
    'sizeName',
    'unitsToProduce'
  );
}

function isProductDesignVariantsIO(
  candidates: object[]
): candidates is ProductDesignVariantIO[] {
  return candidates.every(isProductDesignVariantIO);
}

function* replaceVariants(
  this: Koa.Application.Context
): AsyncIterableIterator<ProductDesignVariant[]> {
  const { designId } = this.query;
  const { body } = this.request;

  if (!designId) {
    return this.throw(
      400,
      'A designId needs to be specified in the query parameters!'
    );
  }
  if (!this.state.permissions || !this.state.permissions.canEditVariants) {
    return this.throw(
      400,
      'These variants are locked! You cannot edit variants after payment.'
    );
  }

  if (Array.isArray(body) && isProductDesignVariantsIO(body)) {
    const variants = yield ProductDesignVariantsDAO.replaceForDesign(
      designId,
      body
    );
    this.body = variants;
    this.status = 200;
  } else {
    this.throw(400, 'Request does not match product design variants');
  }
}

function* getVariants(
  this: Koa.Application.Context
): AsyncIterableIterator<ProductDesignVariant[]> {
  const { designId } = this.query;

  if (!designId) {
    this.throw(
      400,
      'A designId needs to be specified in the query parameters!'
    );
    return;
  }

  this.body = yield ProductDesignVariantsDAO.findByDesignId(designId);
  this.status = 200;
}

router.put(
  '/',
  requireAuth,
  canAccessDesignInQuery,
  canEditDesign,
  replaceVariants
);
router.get('/', requireAuth, canAccessDesignInQuery, getVariants);

module.exports = router.routes();

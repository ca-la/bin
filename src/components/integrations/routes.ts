import Router from 'koa-router';
import { createDesignAndVariant } from './shopify/routes';
import requireAdmin from '../../middleware/require-admin';

const router = new Router();

router.post('/shopify/products', requireAdmin, createDesignAndVariant);

export default router.routes();

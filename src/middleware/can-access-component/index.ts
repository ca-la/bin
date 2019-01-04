import * as Koa from 'koa';

import ComponentRelationship from '../../components/component-relationships/domain-object';
import * as RelationshipsDAO from '../../components/component-relationships/dao';
import { attachDesignPermissions } from '../can-access-design';
import { findRoot } from '../../dao/components';
import { findByComponentId } from '../../dao/product-design-canvases';
import ProductDesignCanvas from '../../domain-objects/product-design-canvas';

interface RelationshipCanvases {
  sourceCanvas: ProductDesignCanvas;
  targetCanvas: ProductDesignCanvas;
}

async function getCanvases(
  sourceComponentId: string,
  targetComponentId: string
): Promise<RelationshipCanvases> {
  const sourceRoot = await findRoot(sourceComponentId);
  const targetRoot = await findRoot(targetComponentId);
  const sourceCanvas = await findByComponentId(sourceRoot.id);
  const targetCanvas = await findByComponentId(targetRoot.id);

  if (!sourceCanvas) { throw new Error(`Component ${sourceComponentId} has no canvas!`); }
  if (!targetCanvas) { throw new Error(`Component ${targetComponentId} has no canvas!`); }

  return { sourceCanvas, targetCanvas };
}

export function* canEditComponentsInBody(
  this: Koa.Application.Context<ComponentRelationship>,
  next: () => Promise<any>
): any {
  const { sourceComponentId, targetComponentId } = this.request.body;
  const { sourceCanvas, targetCanvas } = yield getCanvases(sourceComponentId, targetComponentId);

  yield attachDesignPermissions.call(this, sourceCanvas.designId);
  const { permissions: sourcePermissions } = this.state;
  yield attachDesignPermissions.call(this, targetCanvas.designId);
  const { permissions: targetPermissions } = this.state;

  this.assert(
    targetPermissions
    && targetPermissions.canEdit
    && sourcePermissions
    && sourcePermissions.canEdit,
    403,
    `You don't have permission to edit components ${sourceComponentId}, ${targetComponentId}`
  );

  yield next;
}

export function* canEditComponentsInRelationshipParam(
  this: Koa.Application.Context<ComponentRelationship>,
  next: () => Promise<any>
): any {
  const { relationshipId } = this.params;
  const relationship = yield RelationshipsDAO.findById(relationshipId);
  this.assert(relationship, 400, `ComponentRelationship ${relationshipId} not found!`);

  const { sourceCanvas, targetCanvas } = yield getCanvases(
    relationship.sourceComponentId,
    relationship.targetComponentId
  );

  yield attachDesignPermissions.call(this, sourceCanvas.designId);
  const { permissions: sourcePermissions } = this.state;
  yield attachDesignPermissions.call(this, targetCanvas.designId);
  const { permissions: targetPermissions } = this.state;

  this.assert(
    targetPermissions
    && targetPermissions.canEdit
    && sourcePermissions
    && sourcePermissions.canEdit,
    403,
    `You don't have permission to edit ComponentRelationship ${relationshipId}`
  );

  yield next;
}

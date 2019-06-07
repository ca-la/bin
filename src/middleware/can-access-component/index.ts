import * as Koa from 'koa';

import ComponentRelationship from '../../components/component-relationships/domain-object';
import * as RelationshipsDAO from '../../components/component-relationships/dao';
import { attachDesignPermissions } from '../can-access-design';
import { findRoot } from '../../components/components/dao';
import { findByComponentId } from '../../components/canvases/dao';
import Canvas from '../../components/canvases/domain-object';

interface RelationshipCanvases {
  sourceCanvas: Canvas;
  targetCanvas: Canvas;
}

async function getCanvases(
  sourceComponentId: string,
  targetComponentId: string
): Promise<RelationshipCanvases> {
  const sourceRoot = await findRoot(sourceComponentId);
  const targetRoot = await findRoot(targetComponentId);
  const sourceCanvas = await findByComponentId(sourceRoot.id);
  const targetCanvas = await findByComponentId(targetRoot.id);

  if (!sourceCanvas) {
    throw new Error(`Component ${sourceComponentId} has no canvas!`);
  }
  if (!targetCanvas) {
    throw new Error(`Component ${targetComponentId} has no canvas!`);
  }

  return { sourceCanvas, targetCanvas };
}

export function* canViewComponentInQueryParam(
  this: Koa.Application.Context,
  next: () => Promise<any>
): any {
  const { componentId } = this.query;
  this.assert(
    componentId,
    400,
    'Must provide a componentId in the query parameters!'
  );

  const componentRoot = yield findRoot.call(this, componentId);
  const rootCanvas = yield findByComponentId(componentRoot.id);

  if (!rootCanvas) {
    throw new Error(`Component ${componentId} has no canvas!`);
  }

  yield attachDesignPermissions.call(this, rootCanvas.designId);
  const { permissions } = this.state;

  this.assert(
    permissions && permissions.canView,
    403,
    `You don't have permission to view component ${componentId}`
  );

  yield next;
}

export function* canEditComponentsInBody(
  this: Koa.Application.Context<ComponentRelationship>,
  next: () => Promise<any>
): any {
  const { sourceComponentId, targetComponentId } = this.request.body;
  const { sourceCanvas, targetCanvas } = yield getCanvases(
    sourceComponentId,
    targetComponentId
  );

  yield attachDesignPermissions.call(this, sourceCanvas.designId);
  const { permissions: sourcePermissions } = this.state;
  yield attachDesignPermissions.call(this, targetCanvas.designId);
  const { permissions: targetPermissions } = this.state;

  this.assert(
    targetPermissions &&
      targetPermissions.canEdit &&
      sourcePermissions &&
      sourcePermissions.canEdit,
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
  this.assert(
    relationship,
    400,
    `ComponentRelationship ${relationshipId} not found!`
  );

  const { sourceCanvas, targetCanvas } = yield getCanvases(
    relationship.sourceComponentId,
    relationship.targetComponentId
  );

  yield attachDesignPermissions.call(this, sourceCanvas.designId);
  const { permissions: sourcePermissions } = this.state;
  yield attachDesignPermissions.call(this, targetCanvas.designId);
  const { permissions: targetPermissions } = this.state;

  this.assert(
    targetPermissions &&
      targetPermissions.canEdit &&
      sourcePermissions &&
      sourcePermissions.canEdit,
    403,
    `You don't have permission to edit ComponentRelationship ${relationshipId}`
  );

  yield next;
}

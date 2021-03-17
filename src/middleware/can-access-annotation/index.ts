import Koa from "koa";
import { getDesignPermissions } from "../../services/get-permissions";
import { findDesignByAnnotationId } from "../../components/product-designs/dao/dao";

/**
 * Determines whether or not the current user has access to the supplied annotation.
 */
export function* canAccessAnnotationInParams(
  this: Koa.Context,
  next: () => any
): any {
  const { role, userId } = this.state;
  const { annotationId } = this.params;

  if (!annotationId) {
    this.throw(400, "Must provide an annotationId in the query parameters.");
  }
  const design = yield findDesignByAnnotationId(annotationId);
  if (!design) {
    this.throw(404, "Design cannot be found.");
  }
  this.state.permissions = yield getDesignPermissions({
    designId: design.id,
    sessionRole: role,
    sessionUserId: userId,
  });
  const { permissions } = this.state;

  this.assert(
    permissions && permissions.canView,
    403,
    "You don't have permission to view the annotation on this design."
  );

  yield next;
}

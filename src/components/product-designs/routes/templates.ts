import createFromDesignTemplate from "../../templates/services/create-from-design-template";
import filterError = require("../../../services/filter-error");
import ResourceNotFoundError from "../../../errors/resource-not-found";
import { getDesignPermissions } from "../../../services/get-permissions";
import { attachResources } from "./index";

export function* createFromTemplate(
  this: TrxContext<AuthedContext>
): Iterator<any, any, any> {
  const { userId, role, trx } = this.state;
  const { isPhidias, collectionId } = this.query;
  const { templateDesignId } = this.params;
  const templateDesign = yield createFromDesignTemplate(trx, {
    isPhidias: isPhidias === "true",
    newCreatorId: userId,
    templateDesignId,
    collectionId,
  }).catch(
    filterError(ResourceNotFoundError, (err: ResourceNotFoundError) =>
      this.throw(400, err)
    )
  );

  const designPermissions = yield getDesignPermissions({
    designId: templateDesign.id,
    sessionRole: role,
    sessionUserId: userId,
  });

  const design = yield attachResources(
    templateDesign,
    userId,
    designPermissions
  );

  this.body = design;
  this.status = 201;
}

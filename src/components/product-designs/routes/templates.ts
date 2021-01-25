import createFromDesignTemplate from "../../templates/services/create-from-design-template";
import filterError = require("../../../services/filter-error");
import ResourceNotFoundError from "../../../errors/resource-not-found";

export function* createFromTemplate(
  this: TrxContext<AuthedContext>
): Iterator<any, any, any> {
  const { userId, trx } = this.state;
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

  this.body = templateDesign;
  this.status = 201;
}

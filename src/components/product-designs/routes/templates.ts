import createFromDesignTemplate from "../../templates/services/create-from-design-template";
import filterError = require("../../../services/filter-error");
import ResourceNotFoundError from "../../../errors/resource-not-found";

export function* createFromTemplate(
  this: AuthedContext
): Iterator<any, any, any> {
  const { userId } = this.state;
  const { isPhidias } = this.query;
  const { templateDesignId } = this.params;
  const templateDesign = yield createFromDesignTemplate({
    isPhidias: isPhidias === "true",
    newCreatorId: userId,
    templateDesignId,
  }).catch(
    filterError(ResourceNotFoundError, (err: ResourceNotFoundError) =>
      this.throw(400, err)
    )
  );

  this.body = templateDesign;
  this.status = 201;
}

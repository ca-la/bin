import Knex from "knex";

import ProductDesignsDAO from "../../components/product-designs/dao";
import ProductDesign = require("../../components/product-designs/domain-objects/product-design");
import DesignEventsDAO from "../../components/design-events/dao";
import DesignEvent from "../../components/design-events/types";

export default async function isEveryDesignPaired(
  trx: Knex.Transaction,
  collectionId: string
): Promise<boolean> {
  const collectionDesigns = await ProductDesignsDAO.findByCollectionId(
    collectionId,
    trx
  );
  const designIds = collectionDesigns.map((cd: ProductDesign) => cd.id);
  const designEvents = await Promise.all(
    designIds.map((id: string) => DesignEventsDAO.find(trx, { designId: id }))
  );

  return designEvents.every((eventsList: DesignEvent[]) =>
    eventsList.some((event: DesignEvent) => event.type === "ACCEPT_SERVICE_BID")
  );
}

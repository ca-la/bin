import ProductDesignsDAO from "../../components/product-designs/dao";
import ProductDesign = require("../../components/product-designs/domain-objects/product-design");
import * as DesignEventsDAO from "../../dao/design-events";
import DesignEvent from "../../domain-objects/design-event";

export default async function isEveryDesignPaired(
  collectionId: string
): Promise<boolean> {
  const collectionDesigns = await ProductDesignsDAO.findByCollectionId(
    collectionId
  );
  const designIds = collectionDesigns.map((cd: ProductDesign) => cd.id);
  const designEvents = await Promise.all(
    designIds.map((id: string) => DesignEventsDAO.findByDesignId(id))
  );

  return designEvents.every((eventsList: DesignEvent[]) =>
    eventsList.some((event: DesignEvent) => event.type === "ACCEPT_SERVICE_BID")
  );
}

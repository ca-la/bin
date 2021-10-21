import Knex from "knex";

import * as IrisService from "../../../iris/send-message";
import { getCollectionCartDetails } from "../cost-meta";
import { getUsersWhoCanCheckoutByCollectionId } from "../../../../components/notifications/service";
import { realtimeCartDetailsCollectionUpdate } from "../../realtime";

export async function sendCartDetailsUpdate(
  ktx: Knex,
  collectionId: string
): Promise<void> {
  const collectionCartDetails = await getCollectionCartDetails(
    ktx,
    collectionId
  );
  if (!collectionCartDetails) {
    return;
  }

  const userIds = await getUsersWhoCanCheckoutByCollectionId(ktx, collectionId);
  for (const userId of userIds) {
    await IrisService.sendMessage(
      realtimeCartDetailsCollectionUpdate(userId, collectionCartDetails)
    );
  }
}

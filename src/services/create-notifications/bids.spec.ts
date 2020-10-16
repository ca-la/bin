import tape from "tape";
import { pick } from "lodash";

import { sandbox, test } from "../../test-helpers/fresh";
import * as SlackService from "../../services/slack";
import DesignsDAO from "../../components/product-designs/dao";
import * as UsersDAO from "../../components/users/dao";
import Config from "../../config";
import createUser = require("../../test-helpers/create-user");
import { sendPartnerRejectServiceBidNotification } from "./index";
import createDesign from "../create-design";
import { NotificationType } from "../../components/notifications/domain-object";
import * as NotificationAnnouncer from "../../components/iris/messages/notification";
import { BidRejection } from "../../components/bid-rejections/domain-object";

test("sendPartnerRejectServiceBidNotification creates a notification and sends to slack", async (t: tape.Test) => {
  const { user: partner } = await createUser({
    role: "PARTNER",
    withSession: false,
  });
  const { user: calaOps } = await createUser({
    role: "ADMIN",
    withSession: false,
  });
  const design = await createDesign({
    productType: "TEESHIRT",
    title: "Plain White Tee",
    userId: calaOps.id,
  });

  sandbox()
    .stub(NotificationAnnouncer, "announceNotificationCreation")
    .resolves({});
  const slackStub = sandbox()
    .stub(SlackService, "enqueueSend")
    .returns(Promise.resolve());
  sandbox().stub(Config, "CALA_OPS_USER_ID").value(calaOps.id);
  const designsStub = sandbox().stub(DesignsDAO, "findById").resolves({
    id: design.id,
  });
  const partnersStub = sandbox().stub(UsersDAO, "findById").resolves({
    id: partner.id,
  });

  const notification = await sendPartnerRejectServiceBidNotification({
    actorId: partner.id,
    bidRejection: {
      id: "bid-rejection-foo",
    } as BidRejection,
    designId: design.id,
  });

  t.deepEqual(
    pick(
      notification,
      "actorUserId",
      "designId",
      "recipientUserId",
      "type",
      "sentEmailAt"
    ),
    {
      actorUserId: partner.id,
      designId: design.id,
      recipientUserId: calaOps.id,
      type: NotificationType.PARTNER_REJECT_SERVICE_BID,
      sentEmailAt: null,
    },
    "Returns a newly generated notification"
  );

  t.true(slackStub.calledOnce);
  t.deepEqual(slackStub.args[0][0], {
    channel: "partners",
    params: {
      bidRejection: { id: "bid-rejection-foo" },
      design: { id: design.id },
      partner: { id: partner.id },
    },
    templateName: "partner_reject_bid",
  });
  t.true(designsStub.calledOnce);
  t.true(partnersStub.calledOnce);
});

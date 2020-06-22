import createUser from "../../test-helpers/create-user";
import { authHeader, get } from "../../test-helpers/http";
import { sandbox, test, Test } from "../../test-helpers/fresh";

import * as PermissionsService from "../../services/get-permissions";
import * as ApprovalStepsDAO from "../approval-steps/dao";
import ShipmentTrackingsDAO from "./dao";
import { Courier } from "./types";

async function setup() {
  const designer = await createUser();
  const admin = await createUser({ role: "ADMIN" });

  return {
    users: {
      designer,
      admin,
    },
    stubs: {
      stepsStub: sandbox().stub(ApprovalStepsDAO, "findById"),
      trackingsStub: sandbox().stub(ShipmentTrackingsDAO, "find"),
      permissionsStub: sandbox().stub(
        PermissionsService,
        "getDesignPermissions"
      ),
    },
  };
}

test("GET /shipment-trackings?approvalStepId", async (t: Test) => {
  const {
    users: { designer },
    stubs,
  } = await setup();

  stubs.stepsStub.resolves({
    id: "an-approval-step-id",
    designId: "a-design-id",
  });
  stubs.permissionsStub.resolves({
    canComment: true,
    canDelete: true,
    canEdit: true,
    canEditVariants: false,
    canSubmit: true,
    canView: true,
  });
  stubs.trackingsStub.resolves([
    {
      id: "a-shipment-tracking-id",
      courier: Courier.USPS,
      trackingId: "aTRACKINGid",
      description: null,
      approvalStepId: "an approval step id",
      createdAt: new Date(),
    },
    {
      id: "another-shipment-tracking-id",
      courier: Courier.USPS,
      trackingId: "anotherTRACKINGid",
      description: null,
      approvalStepId: "an-approval-step-id",
      createdAt: new Date(),
    },
  ]);

  const [response, body] = await get(
    "/shipment-trackings?approvalStepId=an-approval-step-id",
    {
      headers: authHeader(designer.session.id),
    }
  );

  t.is(response.status, 200, "successful response");
  t.is(body.length, 2, "returns relevant trackings");

  stubs.permissionsStub.resolves({
    canComment: false,
    canDelete: false,
    canEdit: false,
    canEditVariants: false,
    canSubmit: false,
    canView: false,
  });

  const [notPermitted] = await get(
    "/shipment-trackings?approvalStepId=an-approval-step-id",
    {
      headers: authHeader(designer.session.id),
    }
  );

  t.is(notPermitted.status, 403, "unauthorized response");

  stubs.stepsStub.resolves(null);

  const [stepNotFound] = await get(
    "/shipment-trackings?approvalStepId=an-approval-step-id",
    {
      headers: authHeader(designer.session.id),
    }
  );

  t.is(stepNotFound.status, 404, "step not found");

  const [missingQuery] = await get("/shipment-trackings", {
    headers: authHeader(designer.session.id),
  });

  t.is(missingQuery.status, 400, "missing approvalStepId query parameter");
});

import { sandbox, test, Test } from "../../test-helpers/fresh";
import SessionsDAO from "../../dao/sessions";
import * as PermissionsService from "../../services/get-permissions";
import { authHeader, get } from "../../test-helpers/http";

import * as ParticipantsDAO from "./dao";
import ProductDesignsDAO from "../product-designs/dao";
import { MentionType } from "../comments/types";
import Session from "../../domain-objects/session";
import { Participant } from "./types";

const validSession: Partial<Session> = {
  role: "USER",
  userId: "a-user-id",
};

const collaboratorParticipant: Participant = {
  type: MentionType.COLLABORATOR,
  id: "a-collaborator-id",
  displayName: "A name",
  role: "USER",
  label: null,
  userId: null,
  bidTaskTypes: [],
};

const collaboratorParticipant2: Participant = {
  type: MentionType.COLLABORATOR,
  id: "a-collaborator-id",
  displayName: "A name",
  role: "USER",
  label: null,
  userId: "a-user-id",
  bidTaskTypes: [],
};

const teamUserParticipant: Participant = {
  type: MentionType.TEAM_USER,
  id: "a-collaborator-id",
  displayName: "A team user name",
  role: "USER",
  label: "Team User label",
  userId: "a-user-id",
  bidTaskTypes: [],
};

test("GET /participants?designId", async (t: Test) => {
  const sessionStub = sandbox()
    .stub(SessionsDAO, "findById")
    .resolves(validSession);
  const permissionsStub = sandbox()
    .stub(PermissionsService, "getDesignPermissions")
    .resolves(PermissionsService.FULL_ACCESS);

  sandbox().stub(ProductDesignsDAO, "findById").resolves({});
  sandbox()
    .stub(ParticipantsDAO, "findByDesign")
    .resolves([
      collaboratorParticipant,
      collaboratorParticipant2,
      teamUserParticipant,
    ]);

  const [response, body] = await get("/participants?designId=a-design-id", {
    headers: authHeader("a-session-id"),
  });

  t.equal(response.status, 200, "valid request / returns successfully");
  t.deepEqual(
    body,
    [
      collaboratorParticipant,
      { ...collaboratorParticipant2, label: teamUserParticipant.label },
      teamUserParticipant,
    ],
    "valid request / returns DAO output"
  );

  const [missingParam] = await get("/participants", {
    headers: authHeader("a-session-id"),
  });

  t.equal(
    missingParam.status,
    400,
    "missing param / returns an invalid data error"
  );

  sessionStub.resolves(null);
  const [notAuthenticated] = await get("/participants?designId=a-design-id", {
    headers: authHeader("a-session-id"),
  });

  t.equal(
    notAuthenticated.status,
    401,
    "no session / returns an unauthorized error"
  );

  sessionStub.resolves(validSession);
  permissionsStub.resolves({
    canComment: false,
    canDelete: false,
    canEdit: false,
    canEditTitle: false,
    canEditVariants: false,
    canSubmit: false,
    canView: false,
  });

  const [forbidden] = await get("/participants?designId=a-design-id", {
    headers: authHeader("a-session-id"),
  });

  t.equal(
    forbidden.status,
    403,
    "no design permissions / returns a forbidden status"
  );

  permissionsStub.resolves(PermissionsService.FULL_ACCESS);
});

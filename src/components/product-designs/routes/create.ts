import { z } from "zod";
import convert from "koa-convert";
import Knex from "knex";

import {
  SafeBodyState,
  safeQuery,
  SafeQueryState,
  typeGuardFromSchema,
} from "../../../middleware/type-guard";
import useTransaction, {
  TransactionState,
} from "../../../middleware/use-transaction";
import { StrictContext } from "../../../router-context";
import createDesign from "../../../services/create-design";
import * as CollaboratorsDAO from "../../collaborators/dao";
import TeamUsersDAO from "../../team-users/dao";
import {
  getDesignPermissions,
  Permissions,
} from "../../../services/get-permissions";
import { User } from "../../users/types";
import { Role as TeamUserRole } from "../../team-users/types";
import ProductDesign from "../domain-objects/product-design";
import * as UsersDAO from "../../users/dao";
import requireAuth from "../../../middleware/require-auth";
import * as CollectionsDAO from "../../collections/dao";
import Collaborator, {
  Roles as CollaboratorRole,
} from "../../collaborators/types";
import filterError from "../../../services/filter-error";
import ResourceNotFoundError from "../../../errors/resource-not-found";
import createFromDesignTemplate from "../../templates/services/create-from-design-template";

const CAN_CREATE_TEAM_ROLES: TeamUserRole[] = [
  TeamUserRole.ADMIN,
  TeamUserRole.EDITOR,
  TeamUserRole.OWNER,
  TeamUserRole.TEAM_PARTNER,
];

const CAN_CREATE_COLLABORATOR_ROLES: CollaboratorRole[] = [
  "EDIT",
  "OWNER",
  "PARTNER",
];

async function canCreate(
  collectionId: string | null,
  userId: string,
  sessionRole: string,
  trx: Knex.Transaction
) {
  if (collectionId === null || sessionRole === "ADMIN") {
    return true;
  }

  const maybeCollection = await CollectionsDAO.findById(collectionId);
  const collectionCollaborators = await CollaboratorsDAO.findByCollectionAndUser(
    collectionId,
    userId,
    trx
  );
  const canCreateCollaborator = collectionCollaborators.some(
    (collaborator: Collaborator) =>
      CAN_CREATE_COLLABORATOR_ROLES.includes(collaborator.role)
  );

  if (canCreateCollaborator) {
    return true;
  }

  const teamId = maybeCollection?.teamId;
  const maybeTeamUser = teamId
    ? await TeamUsersDAO.findOne(trx, { teamId, userId })
    : null;

  const canCreateTeamUser = maybeTeamUser
    ? CAN_CREATE_TEAM_ROLES.includes(maybeTeamUser.role)
    : false;

  return canCreateTeamUser;
}

const createBodySchema = z.object({
  title: z.string(),
  collectionIds: z.array(z.string()).nullable().optional(),
});
type CreateBody = z.infer<typeof createBodySchema>;

interface CreateResponseBody extends ProductDesign {
  permissions: Permissions;
  owner: User;
}

interface CreateContext extends StrictContext<CreateResponseBody> {
  state: AuthedState & SafeBodyState<CreateBody> & TransactionState;
}

async function create(ctx: CreateContext) {
  const { role: sessionRole, userId, safeBody, trx } = ctx.state;

  const collectionId = safeBody.collectionIds
    ? safeBody.collectionIds[0]
    : null;

  ctx.assert(
    await canCreate(collectionId, userId, sessionRole, trx),
    403,
    "You do not have permission to create a design in this collection"
  );

  const design = await createDesign({ ...safeBody, userId }, trx);

  const permissions = await getDesignPermissions({
    designId: design.id,
    sessionRole,
    sessionUserId: userId,
    trx,
  });
  const owner = await UsersDAO.findById(userId, trx);

  // Unexpected: Owner should exist in an authed route. Checked for safety.
  ctx.assert(owner, 404, `No user found with ID ${userId}`);

  ctx.status = 201;
  ctx.body = {
    ...design,
    permissions,
    owner,
  };
}

const createFromTemplateQuerySchema = z.object({
  collectionId: z
    .string()
    .optional()
    .transform((optionalCollectionId: string | undefined) =>
      optionalCollectionId !== undefined ? optionalCollectionId : null
    ),
});
type CreateFromTemplateQuery = z.infer<typeof createFromTemplateQuerySchema>;

interface CreateFromTemplateContext extends StrictContext<ProductDesign> {
  state: AuthedState &
    TransactionState &
    SafeQueryState<CreateFromTemplateQuery>;
  params: { templateDesignId: string };
}

async function createFromTemplate(ctx: CreateFromTemplateContext) {
  const { userId, role, trx } = ctx.state;
  const { collectionId } = ctx.state.safeQuery;
  const { templateDesignId } = ctx.params;

  ctx.assert(
    await canCreate(collectionId, userId, role, trx),
    403,
    "You do not have permission to create a design in this collection"
  );

  const templateDesign = await createFromDesignTemplate(trx, {
    isPhidias: false,
    newCreatorId: userId,
    templateDesignId,
    collectionId,
  }).catch(
    filterError(ResourceNotFoundError, (err: ResourceNotFoundError) =>
      ctx.throw(400, err)
    )
  );

  const permissions = await getDesignPermissions({
    trx,
    designId: templateDesign.id,
    sessionRole: role,
    sessionUserId: userId,
  });
  const owner = await UsersDAO.findById(userId, trx);

  // Unexpected: Owner should exist in an authed route. Checked for safety.
  ctx.assert(owner, 404, `No user found with ID ${userId}`);

  ctx.status = 201;
  ctx.body = {
    ...templateDesign,
    permissions,
    owner,
  };
}

export const routes = {
  create: [
    requireAuth,
    typeGuardFromSchema(createBodySchema),
    useTransaction,
    convert.back(create),
  ],
  createFromTemplate: [
    requireAuth,
    safeQuery(createFromTemplateQuerySchema),
    useTransaction,
    convert.back(createFromTemplate),
  ],
};

import { sandbox } from "../../test-helpers/fresh";
import Sinon from "sinon";
import * as CollaboratorsDAO from "../../components/collaborators/dao";
import { CollaboratorWithUserMetaByDesign } from "../../components/collaborators/domain-objects/collaborator-by-design";
import { Roles } from "../../components/collaborators/domain-objects/collaborator";

export const stubFindByDesigns = (
  userId: string
): {
  collaboratorsByDesign: CollaboratorWithUserMetaByDesign[];
  stub: Sinon.SinonStub;
} => {
  const collaboratorsByDesign = [
    {
      collaborators: [
        {
          cancelledAt: null,
          collectionId: null,
          createdAt: new Date("2019-02-06T18:20:45.530Z"),
          deletedAt: null,
          designId: "48b54194-257f-42a3-a6a2-31e91862a463",
          id: "f041c8de-4e6c-4d2b-afc1-f421acc80d6d",
          invitationMessage: "Whats up",
          role: "EDIT" as Roles,
          user: null,
          userEmail: null,
          userId,
        },
      ],
      designId: "48b54194-257f-42a3-a6a2-31e91862a463",
    },
    {
      collaborators: [
        {
          cancelledAt: null,
          collectionId: null,
          createdAt: new Date("2019-02-01T18:20:47.170Z"),
          deletedAt: null,
          designId: "4e92fdf8-fc6c-4d33-96f6-ba325d9ab5e8",
          id: "4c73d39e-6833-420a-9e3c-78ebc77b95b3",
          invitationMessage: "Come join me brah",
          role: "EDIT" as Roles,
          user: null,
          userEmail: null,
          userId,
        },
      ],
      designId: "4e92fdf8-fc6c-4d33-96f6-ba325d9ab5e8",
    },
  ];

  const stub = sandbox()
    .stub(CollaboratorsDAO, "findByDesigns")
    .resolves(collaboratorsByDesign);

  return {
    collaboratorsByDesign,
    stub,
  };
};

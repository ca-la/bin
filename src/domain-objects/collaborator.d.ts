export declare class Collaborator {
  public id: string;
  public collectionId: string;
  public designId: string;
  public userId: string | null;
  public userEmail: string | null;
  public invitationMessage: string;
  public role: string;
  public createdAt: Date;
  public deletedAt: Date | null;

  constructor(data: any);
}

export interface CollaboratorWithUserId extends Collaborator {
  userId: string;
}

export interface CollaboratorRow {
  id: string;
  collection_id: string;
  design_id: string;
  user_id: string | null;
  user_email: string | null;
  invitation_message: string;
  role: string;
  created_at: Date;
  deleted_at: Date | null;
}

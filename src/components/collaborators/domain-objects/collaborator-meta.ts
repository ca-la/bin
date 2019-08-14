export interface CollaboratorMeta {
  id: string;
  cancelledAt: Date | null;
}

export interface CollaboratorMetaRow {
  id: string;
  cancelled_at: string | null;
}

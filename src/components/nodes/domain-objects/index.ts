export default interface Node {
  id: string;
  createdAt: Date;
  createdBy: string;
  deletedAt: Date | null;
  parentId: string | null;
  x: number;
  y: number;
  ordering: number;
  title: string | null;
}

export interface NodeRow {
  id: string;
  created_at: string;
  created_by: string;
  deleted_at: string | null;
  parent_id: string | null;
  x: string;
  y: string;
  ordering: number;
  title: string | null;
}

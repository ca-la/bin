export interface Team {
  id: string;
  title: string;
  createdAt: Date;
  deletedAt: Date | null;
}

export interface TeamRow {
  id: string;
  title: string;
  created_at: Date;
  deleted_at: Date | null;
}

export function isUnsavedTeam(
  candidate: Record<string, any>
): candidate is Unsaved<Team> {
  const keyset = new Set(Object.keys(candidate));

  return ["title"].every(keyset.has.bind(keyset));
}

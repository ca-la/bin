interface MightHaveTitle {
  title?: string | null;
}

export default function normalizeTitle(resource?: MightHaveTitle | null): string {
  return (resource && resource.title) || 'Untitled';
}

import SessionsDAO from '../../dao/sessions';

export async function attachSession(
  authToken: string,
  queryToken?: string
): Promise<AuthedKoaState | null> {
  const headerMatches = /^Token (.+)$/.exec(authToken);
  const token = (headerMatches && headerMatches[1]) || queryToken;

  if (!token) {
    return null;
  }

  const session = await SessionsDAO.findById(token);

  if (!session) {
    return null;
  }

  return {
    token,
    role: session.role,
    userId: session.userId
  };
}

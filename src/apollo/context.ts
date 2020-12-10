import SessionsDAO from "../dao/sessions";
import db from "../services/db";

import { GraphQLContextBase } from "./types";

export interface ContextParams {
  ctx: any;
}

export async function attachSession(
  authToken: string,
  queryToken?: string
): Promise<AuthedState | null> {
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
    userId: session.userId,
  };
}

export async function context({
  ctx,
}: ContextParams): Promise<GraphQLContextBase> {
  const session = await attachSession(
    ctx.req.headers.authorization,
    ctx.query.token
  );
  const trx = await db.transaction();
  return { session, trx };
}
import uuid from "node-uuid";
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
    trackingId: uuid.v4(),
    tracking: [],
  };
}

export async function context({
  ctx,
}: ContextParams): Promise<GraphQLContextBase<null>> {
  const session = await attachSession(
    ctx.req.headers.authorization,
    ctx.query.token
  );
  const transactionProvider = await db.transactionProvider();
  return { session, transactionProvider, earlyResult: null };
}

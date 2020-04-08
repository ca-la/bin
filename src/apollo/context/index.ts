import { ContextFunction } from 'apollo-server-core';
import { attachSession } from './attach-session';

export type ContextParams = any;

export interface ProducedContext {
  session: AuthedState | null;
}

async function handleContext({ ctx }: ContextParams): Promise<ProducedContext> {
  const session = await attachSession(
    ctx.req.headers.authorization,
    ctx.query.token
  );
  return { session };
}

const context: ContextFunction<ContextParams, ProducedContext> = (
  request: ContextParams
): Promise<ProducedContext> => {
  return handleContext(request);
};

export default context;

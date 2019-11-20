import { ProducedContext } from '../../context';
import * as SessionsDAO from '../../../dao/sessions';
import Session from '../../../domain-objects/session';

async function login(
  _1: any,
  args: {
    email: string;
    expireAfterSeconds: number | null;
    password: string;
    role: string;
  },
  _2: ProducedContext
): Promise<Session> {
  const { email, expireAfterSeconds, password, role } = args;

  const expiresAt = expireAfterSeconds
    ? new Date(new Date().getTime() + expireAfterSeconds * 1000)
    : null;

  const session = await SessionsDAO.create({
    email,
    expiresAt,
    password,
    role
  });

  return session;
}

const resolver = {
  Mutation: {
    login
  }
};

export default resolver;

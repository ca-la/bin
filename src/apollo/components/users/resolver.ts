import { findById } from '../../../components/users/dao';
import { ProducedContext } from '../../context';
import requireAdmin from '../../authorization/require-admin.ts';

async function findUserById(
  _: any,
  args: { id: string },
  context: ProducedContext
): Promise<object> {
  requireAdmin(context);

  const user = await findById(args.id);

  if (!user) {
    throw new Error(`User "${args.id}" could not be found.`);
  }

  return user;
}

const resolver = {
  Query: {
    user: findUserById
  }
};

export default resolver;

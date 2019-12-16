import process from 'process';
import { log, logServerError } from '../services/logger';
import { green, reset } from '../services/colors';

import * as UsersDAO from '../components/users/dao';
import { UserIO } from '../components/users/domain-object';
import createDesign from '../services/create-design';
import { Role } from '@cala/ts-lib';

insertNewUserWithDesign()
  .then(() => {
    log(`${green}Successfully inserted!`);
    process.exit();
  })
  .catch(
    (err: any): void => {
      logServerError(err);
      process.exit(1);
    }
  );

async function insertNewUserWithDesign(): Promise<void> {
  const email = process.argv[2];
  const password = process.argv[3];
  const role = process.argv[4];

  if (!password || !email) {
    throw new Error(
      'Usage: insert-user-with-design.ts <email> <password> [role]'
    );
  }

  if (role && !(role === 'ADMIN' || role === 'USER' || role === 'PARTNER')) {
    throw new Error('Invalid Role: Must be "ADMIN | USER | PARTNER"');
  }

  const newUser: UserIO = {
    email,
    password,
    name: null,
    role: (role as Role) || 'USER',
    referralCode: 'n/a'
  };

  const insertedUser = await UsersDAO.create(newUser);

  log(`${reset}Inserted user:
    ${JSON.stringify(insertedUser, null, 2)}
  `);

  const newDesign = {
    userId: insertedUser.id,
    title: `${insertedUser.email}'s Design`,
    productType: null
  };

  const insertedDesign = await createDesign(newDesign);
  log(`${reset}Inserted design:
  ${JSON.stringify(insertedDesign, null, 2)}
  `);
}

'use strict';

const ScansDAO = require('../../dao/scans');
const db = require('../../services/db');
const Logger = require('../../services/logger');

function createUserScan(userId) {
  return ScansDAO.create({
    type: ScansDAO.SCAN_TYPES.humanSolutions,
    userId,
    isComplete: true
  });
}

return db('users').select()
  .then((users) => {
    Logger.log(`Found ${users.length} users to create Human Solutions scan records for`);
    return Promise.all(users.map(user => createUserScan(user.id)));
  })
  .then((scans) => {
    Logger.log(`Created ${scans.length} scans`);

    process.exit(0);
  });

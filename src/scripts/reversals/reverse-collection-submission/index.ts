import Logger = require('../../../services/logger');
import { reverseSubmissionRecords } from './reverse';

reverseSubmissionRecords(process.argv[2])
  .then(() => {
    process.exit(0);
  })
  .catch((err: Error) => {
    Logger.logServerError(err);
    process.exit(1);
  });

import { makeRequest, md5 } from '.';
import { Response } from 'node-fetch';
import {
  MAILCHIMP_LIST_ID_DESIGNERS,
  MAILCHIMP_LIST_ID_PRODUCTION_PARTNERS,
  MAILCHIMP_LIST_ID_USERS
} from '../../config';
import ResourceNotFoundError from '../../errors/resource-not-found';
import filterError = require('../filter-error');

/**
 * Optimistically update all email lists the user could be a part of.
 * If MailChimp returns a 404 a ResourceNotFoundError will be thrown
 * and ignored.
 */
export function updateEmail(oldEmail: string, newEmail: string): Promise<any> {
  const hash = md5(oldEmail);
  return Promise.all(
    [
      MAILCHIMP_LIST_ID_USERS,
      MAILCHIMP_LIST_ID_DESIGNERS,
      MAILCHIMP_LIST_ID_PRODUCTION_PARTNERS
    ].map(
      (listId: string): Response => {
        const path = `/lists/${listId}/members/${hash}`;
        const requestBody = {
          email_address: newEmail
        };
        return makeRequest('patch', path, requestBody).catch(
          filterError(
            ResourceNotFoundError,
            (): void => {
              /** noop */
            }
          )
        );
      }
    )
  );
}

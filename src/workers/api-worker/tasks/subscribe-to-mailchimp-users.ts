import { Task, HandlerResult } from "../types";
import MailChimp from "../../../services/mailchimp";
import filterError from "../../../services/filter-error";
import ThirdPartyCallError from "../../../errors/third-party-call-error";

export async function subscribeToMailchimpUsers(
  task: Task<"SUBSCRIBE_MAILCHIMP_TO_USERS">
): Promise<HandlerResult> {
  const { keys } = task;
  // Previously we had this *before* the user creation in the DB, effectively
  // using it as a more powerful email validator. That has proven to be noisy as
  // we attempt to subscribe lots of invalid and duplicate emails whenever
  // someone makes a mistake signing up.
  return await MailChimp.subscribeToUsers({
    cohort: keys.cohort,
    email: keys.email,
    name: keys.name,
    referralCode: keys.referralCode,
  })
    .then(() => {
      return {
        type: "SUCCESS",
        message: `SUBSCRIBE_MAILCHIMP_TO_USERS task successfully completed for user ${keys.email}.`,
      };
    })
    .catch(
      filterError(
        ThirdPartyCallError,
        (err: ThirdPartyCallError): HandlerResult => {
          // Mailchimp Errors: https://mailchimp.com/developer/marketing/docs/errors/#common-causes
          const isTooManyRequests = err.code === 429;
          const isServerError = err.code >= 500;
          if (isTooManyRequests || isServerError) {
            return {
              type: "FAILURE",
              error: new Error(
                `Failed to sign up user to Mailchimp: ${keys.email} - ${err.message}`
              ),
            };
          }

          throw err;
        }
      )
    )
    .catch(
      (err: Error): HandlerResult => {
        // Not rethrowing since this shouldn't be fatal... But, if we ever see this
        // log line we need to investigate ASAP (and manually subscribe the user)
        return {
          type: "FAILURE_DO_NOT_RETRY",
          error: new Error(
            `Failed to sign up user to Mailchimp: ${keys.email} - ${err.message}`
          ),
        };
      }
    );
}

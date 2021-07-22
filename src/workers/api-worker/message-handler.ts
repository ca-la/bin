import Knex from "knex";

import db from "../../services/db";
import { Task, HandlerResult, ApiMessages } from "./types";
import { SQSMessage } from "./aws";
import { logServerError, log } from "../../services/logger";
import {
  postProcessUserCreation,
  subscribeToMailchimpUsers,
  postProcessQuotePayment,
  postProcessDeleteComment,
} from "./tasks";

export type MessageHandler = (message: SQSMessage) => Promise<HandlerResult>;
/**
 * Curried function that takes a message and fires the correct api call.
 */
export function messageHandler(): MessageHandler {
  return async (message: SQSMessage): Promise<HandlerResult> => {
    if (!message.Body) {
      return {
        type: "FAILURE_DO_NOT_RETRY",
        error: new Error("No Message Body Found!"),
      };
    }
    const task: Task<keyof ApiMessages> = JSON.parse(message.Body);
    const successMessage = `${task.type} successfully posted!`;

    switch (task.type) {
      case "POST_PROCESS_USER_CREATION": {
        log(successMessage);
        return await db
          .transaction(async (trx: Knex.Transaction) =>
            postProcessUserCreation(
              trx,
              task as Task<"POST_PROCESS_USER_CREATION">
            )
          )
          .catch((error: Error) => {
            logServerError(
              "Error in POST_PROCESS_USER_CREATION api worker task",
              error
            );

            return {
              type: "FAILURE",
              error,
            };
          });
      }

      case "SUBSCRIBE_MAILCHIMP_TO_USERS": {
        log(successMessage);
        return await subscribeToMailchimpUsers(
          task as Task<"SUBSCRIBE_MAILCHIMP_TO_USERS">
        ).catch((error: Error) => {
          logServerError(
            "Error in SUBSCRIBE_MAILCHIMP_TO_USERS api worker task",
            error
          );

          return {
            type: "FAILURE",
            error,
          };
        });
      }

      case "POST_PROCESS_QUOTE_PAYMENT": {
        log(successMessage);
        return await postProcessQuotePayment(
          task as Task<"POST_PROCESS_QUOTE_PAYMENT">
        ).catch((error: Error) => {
          logServerError(
            "Error in POST_PROCESS_QUOTE_PAYMENT api worker task",
            error
          );

          return {
            type: "FAILURE",
            error,
          };
        });
      }

      case "POST_PROCESS_DELETE_COMMENT": {
        log(successMessage);
        return await db
          .transaction(async (trx: Knex.Transaction) =>
            postProcessDeleteComment(
              trx,
              task as Task<"POST_PROCESS_DELETE_COMMENT">
            )
          )
          .catch((error: Error) => {
            logServerError(
              "Error in POST_PROCESS_DELETE_COMMENT api worker task",
              error
            );

            return {
              type: "FAILURE",
              error,
            };
          });
      }

      default: {
        return {
          type: "FAILURE_DO_NOT_RETRY",
          error: new Error(
            `Message type not supported! ${task.type || "(no type)"}`
          ),
        };
      }
    }
  };
}

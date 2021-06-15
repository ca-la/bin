export interface ApiMessages {
  SUBSCRIBE_MAILCHIMP_TO_USERS: {
    keys: {
      cohort: string | null;
      email: string | null;
      name: string;
      referralCode: string;
    };
  };
  POST_PROCESS_USER_CREATION: {
    keys: {
      userId: string;
      designIdsToDuplicate: string[];
      email: string;
    };
  };
  POST_PROCESS_QUOTE_PAYMENT: {
    keys: {
      invoiceId: string;
      userId: string;
      collectionId: string;
      paymentAmountCents: number;
    };
  };
}

export interface Task<MessageKey extends keyof ApiMessages> {
  type: MessageKey;
  deduplicationId: string;
  keys: ApiMessages[MessageKey]["keys"];
}

interface HandlerSuccess {
  type: "SUCCESS";
  message: string | null;
}

interface HandlerFailure {
  type: "FAILURE";
  error: Error;
}

interface HandlerFailureDoNotRetry {
  type: "FAILURE_DO_NOT_RETRY";
  error: Error;
}

export type HandlerResult =
  | HandlerSuccess
  | HandlerFailure
  | HandlerFailureDoNotRetry;

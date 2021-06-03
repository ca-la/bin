export interface ApiMessages {
  WORKER_TEST: {
    keys: {
      id: string;
    };
  };
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
      name: string;
      cohort: string | null;
      referralCode: string;
    };
  };
}

export interface Task<MessageKey extends keyof ApiMessages> {
  type: MessageKey;
  keys: ApiMessages[MessageKey]["keys"];
  deduplicationId: string;
}

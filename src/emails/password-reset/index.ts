import { template } from "lodash";
import emailHtml from "./template";
import { STUDIO_HOST } from "../../config";

export default function passwordReset(data: {
  sessionId: string;
  name: string;
}): string {
  const resetLink = `${STUDIO_HOST}/password-reset?sessionId=${data.sessionId}`;

  return template(emailHtml)({ resetLink });
}

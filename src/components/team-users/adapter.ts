import { fromSchema } from "../../services/cala-component/cala-adapter";
import { defaultEncoder } from "../../services/data-adapter";
import { Serialized } from "../../types/serialized";
import User, { serializedUserSchema } from "../users/types";
import {
  TeamUser,
  teamUserDbRowSchema,
  teamUserDbSchema,
  TeamUserRow,
  teamUserRowSchema,
  teamUserSchema,
} from "./types";

export const rawAdapter = fromSchema({
  modelSchema: teamUserDbSchema,
  rowSchema: teamUserDbRowSchema,
});

export default fromSchema<TeamUser, TeamUserRow>({
  modelSchema: teamUserSchema,
  rowSchema: teamUserRowSchema,
  encodeTransformer: (row: TeamUserRow): TeamUser => {
    const decoded = defaultEncoder<TeamUserRow, TeamUser>(row);

    if (decoded.userId && decoded.user) {
      const user = (decoded.user as unknown) as Serialized<User>;

      return {
        ...decoded,
        user: serializedUserSchema.parse(user),
      };
    }

    return decoded;
  },
});

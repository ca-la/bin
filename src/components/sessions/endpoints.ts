import {
  GraphQLEndpoint,
  GraphQLContextBase,
  ForbiddenError,
  NotFoundError,
} from "../../apollo";
import Session from "../../domain-objects/session";
import * as GraphQLTypes from "./graphql-types";
import * as SessionsDAO from "../../dao/sessions";
import filterError from "../../services/filter-error";
import InvalidDataError from "../../errors/invalid-data";

interface LoginArgs {
  email: string;
  expireAfterSeconds: number | null;
  password: string;
  role: string;
}

const login: GraphQLEndpoint<
  LoginArgs,
  Session,
  GraphQLContextBase<Session>
> = {
  endpointType: "Mutation",
  name: "login",
  types: [GraphQLTypes.Session],
  signature:
    "(email: String!, expireAfterSeconds: Int, password: String!, role: Role): Session!",
  resolver: async (_: any, args: LoginArgs) => {
    const { email, expireAfterSeconds, password, role } = args;

    const expiresAt = expireAfterSeconds
      ? new Date(new Date().getTime() + expireAfterSeconds * 1000)
      : null;

    return SessionsDAO.create({
      email,
      expiresAt,
      password,
      role,
    }).catch(
      filterError(InvalidDataError, () => {
        throw new ForbiddenError("Incorrect credentials");
      })
    );
  },
};

interface GetSessionArgs {
  id: string;
}

export const getSession: GraphQLEndpoint<
  GetSessionArgs,
  Session,
  GraphQLContextBase<Session>
> = {
  endpointType: "Query",
  types: [GraphQLTypes.Session],
  name: "session",
  signature: "(id: String!): Session!",
  resolver: async (_: any, { id }: GetSessionArgs) => {
    const session = await SessionsDAO.findById(id, true);

    if (!session) {
      throw new NotFoundError(`Could not find session ${id}`);
    }

    return session;
  },
};

export const SessionEndpoints = [login, getSession];

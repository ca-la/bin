import { GraphQLEndpoint, GraphQLContextBase } from "../../apollo";
import Session from "../../domain-objects/session";
import * as GraphQLTypes from "./graphql-types";
import * as SessionsDAO from "../../dao/sessions";

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
  endpointType: "MUTATION",
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
    });
  },
};

export const SessionEndpoints = [login];

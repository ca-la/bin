export type GraphQLTypeFieldDescription =
  | string
  | {
      type: string;
      signature: string;
    };
export type GraphQLTypeBody = Record<string, GraphQLTypeFieldDescription>;

interface GraphQLTypeBase {
  name: string;
  requires?: string[];
}

export type GraphQLType =
  | (GraphQLTypeBase & {
      type: "type" | "input";
      body: GraphQLTypeBody;
    })
  | (GraphQLTypeBase & {
      type: "enum";
      body: string;
    });

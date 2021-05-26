export type GraphQLTypeBody = Record<string, string>;

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

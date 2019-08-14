import { makeExecutableSchema } from "graphql-tools";
import gql from "graphql-tag";

import {
  nodeInterface,
  nodeDefinitions,
  globalIdResolver,
  nodeField,
  nodesField,
  pageInfoType,
  connectionDefinitions,
  connectionArgs,
  mutationWithClientMutationId,
  fromGlobalId,
  connectionFromArray
} from "graphql-relay-tools";


export const schema = makeExecutableSchema({
  typeDefs: gql`
    ${nodeInterface}

    scalar Bytes
    scalar ByteOffset

    type Query {
      ${nodeField}
      bytecode(id: ID!): Bytecode
    }

    type LinkValue {
      linkReference: LinkReference!
      value: Bytes
    }

    type LinkReference {
      offsets: [ByteOffset!]!
      length: Int!
    }

    type Bytecode implements Node {
      id: ID!
      bytes: Bytes!
      sourceMap: String
      linkReferences: [LinkReference]
    }

    ${pageInfoType}
  `,
  resolvers: {
    Query: {
      node: {
        resolve (...args) {
          const [_, __, { workspace }] = args;
          const { nodeResolver } = nodeDefinitions( (globalId) => {
            const { type, id } = fromGlobalId(globalId);
            switch (type) {
              case "Bytecode":
                return workspace.bytecode({ id });
            }
          });

          return nodeResolver(...args);
        }
      },
      bytecode: {
        resolve: (_, { id: globalId }, { workspace }) => {
          const { id } = fromGlobalId(globalId);
          return workspace.bytecode({ id });
        }
      }
    },
    Bytecode: {
      id: globalIdResolver()
    },
    Node: {
      __resolveType (root) {
        return root.$resourceType;
      }
    }
  }
});


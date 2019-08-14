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

const { connectionType } = connectionDefinitions({
  name: "Source"
});

export const schema = makeExecutableSchema({
  typeDefs: gql`
    ${nodeInterface}

    scalar Bytes
    scalar ByteOffset
    scalar Object

    type Query {
      ${nodeField}
      bytecode(id: ID!): Bytecode
      source(id: ID!): Source
      compilation(id: ID!): Compilation
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

    type Source implements Node {
      id: ID!
      contents: String!
      sourcePath: String
    }

    type Compilation implements Node {
      id: ID!
      compiler: Compiler
      sources${connectionArgs()}: SourceConnection
    }

    type Compiler {
      name: String
      version: String
      settings: Object
    }


    ${connectionType}
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
              case "Source":
                return workspace.source({ id });
              case "Bytecode":
                return workspace.bytecode({ id });
            }
          });

          return nodeResolver(...args);
        }
      },
      source: {
        resolve: (_, { id: globalId }, { workspace }) => {
          const { id } = fromGlobalId(globalId);
          return workspace.source({ id });
        }
      },
      bytecode: {
        resolve: (_, { id: globalId }, { workspace }) => {
          const { id } = fromGlobalId(globalId);
          return workspace.bytecode({ id });
        }
      },
      compilation: {
        resolve: (_, { id: globalId }, { workspace }) => {
          const { id } = fromGlobalId(globalId);
          return workspace.compilation({ id });
        }
      }
    },
    Source: {
      id: globalIdResolver()
    },
    Bytecode: {
      id: globalIdResolver()
    },
    Compilation: {
      id: globalIdResolver(),
      sources: async (compilation, args, { workspace }) => {
        const sources = await Promise.all(compilation.sources.map(
          async ({ id }) => await workspace.source({ id })
        ));
        return connectionFromArray(sources, args);
      }
    },
    Node: {
      __resolveType (root) {
        return root.$resourceType;
      }
    }
  }
});


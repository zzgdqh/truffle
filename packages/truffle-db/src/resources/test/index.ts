import path from "path";

import gql from "graphql-tag";
import * as graphql from "graphql";

import { ContractObject } from "truffle-contract-schema/spec";

import { generateId } from "truffle-db/helpers";
import { TestClient } from "test/client";


const fixturesDirectory = path.join(
  __dirname, // truffle-db/src/resources/test
  "..", // truffle-db/src/resources
  "..", // truffle-db/src/
  "..", // truffle-db/
  "test",
  "fixtures",
  "basic"
);

const Migrations: ContractObject = require(path.join(fixturesDirectory, "Migrations.json"));

/*
 * Bytecode
 */
describe("Bytecode", () => {
  const GetBytecode = gql`
  query GetBytecode($id: ID!) {
    bytecode(id: $id) {
      bytes
    }
  }`;

  it("retrieves by id", async () => {
    const client = new TestClient({
      contracts_build_directory: fixturesDirectory,
    });

    const variables = {
      bytes: Migrations.bytecode
    };

    // precondition: add bytecode
    const id = await client.addBytecode(variables);

    // ensure retrieved as matching
    {
      const data = await client.execute(GetBytecode, { id });
      expect(data).toHaveProperty("bytecode");

      const { bytecode } = data;
      expect(bytecode).toHaveProperty("bytes");

      const { bytes } = bytecode;
      expect(bytes).toEqual(variables.bytes);
    }
  });
});

describe("Source", () => {
  const GetSource = gql`
  query GetSource($id: ID!) {
    source(id: $id) {
      contents
    }
  }`;

  it("retrieves by id", async () => {
    const client = new TestClient({
      contracts_build_directory: fixturesDirectory,
    });

    const variables = {
      contents: Migrations.source
    };

    // precondition: add source
    const id = await client.addSource(variables);

    // ensure retrieved as matching
    {
      const data = await client.execute(GetSource, { id });
      expect(data).toHaveProperty("source");

      const { source } = data;
      expect(source).toHaveProperty("contents");

      const { contents } = source;
      expect(contents).toEqual(variables.contents);
    }
  });
});

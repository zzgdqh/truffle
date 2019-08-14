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
const GetBytecode = gql`
query GetBytecode($id: ID!) {
  bytecode(id: $id) {
    bytes
  }
}`;


describe("Bytecode", () => {
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
      expect(bytecode).toHaveProperty("id");
      expect(bytecode).toHaveProperty("bytes");

      const { bytes } = bytecode;
      expect(bytes).toEqual(variables.bytes);
    }
  });
});

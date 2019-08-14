import fs from "fs";
import path from "path";
import gql from "graphql-tag";
import { TruffleDB } from "truffle-db";
import * as Contracts from "truffle-workflow-compile";

const fixturesDirectory = path.join(
  __dirname, // truffle-db/src/loaders/artifacts/test
  "..", // truffle-db/src/loaders
  "..", // truffle-db/src/
  "..", // truffle-db/
  "test",
  "fixtures"
);

const sourcesDirectory = path.join(fixturesDirectory, "sources");
const buildDirectory = path.join(fixturesDirectory, "build");
const compilationSourcesDirectory = path.join(fixturesDirectory, "compilationSources");

jest.mock("truffle-workflow-compile", () => ({
 compile: function(config, callback) {
   const magicSquare = require(path.join(sourcesDirectory, "MagicSquare.json"));
   const migrations = require(path.join(sourcesDirectory, "Migrations.json"));
   const squareLib = require(path.join(sourcesDirectory, "SquareLib.json"));
   const vyperStorage = require(path.join(sourcesDirectory, "VyperStorage.json"));
   const returnValue = {
    "outputs": {
      "solc": [
        "/Users/fainashalts/solidity-magic-square/contracts/MagicSquare.sol",
        "/Users/fainashalts/solidity-magic-square/contracts/Migrations.sol",
        "/Users/fainashalts/solidity-magic-square/contracts/SquareLib.sol"
      ],
      "vyper": [
        "/Users/fainashalts/truffle-six/testing2/contracts/VyperStorage.vy",
      ]
    },
    "contracts": [{
      "contract_name": "MagicSquare",
      ...magicSquare
    },
    {
      "contract_name": "Migrations",
      ...migrations
    },
    {
      "contract_name": "SquareLib",
      ...squareLib
    },
    {
      "contract_name": "VyperStorage",
      ...vyperStorage
    },
    ]
  }
   return returnValue;
 }
}));

// minimal config
const config = {
  contracts_build_directory: sourcesDirectory,
  contracts_directory: compilationSourcesDirectory,
  artifacts_directory: path.join(compilationSourcesDirectory, "build", "contracts"),
  all: true
};

const db = new TruffleDB(config);

const Load = gql `
  mutation LoadArtifacts {
    loaders {
      artifactsLoad {
        success
      }
    }
  }
`

it("loads artifacts and returns true ", async () => {
  const {
    data: {
      loaders: {
        artifactsLoad: {
          success
        }
      }
    }
  } = await db.query(Load);
  expect(success).toEqual(true);
});

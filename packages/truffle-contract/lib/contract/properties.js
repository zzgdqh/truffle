const utils = require("../utils");
const web3Utils = require("web3-utils");

module.exports = {
  contract_name: {
    get() {
      return this.contractName;
    },
    set(val) {
      this.contractName = val;
    }
  },
  contractName: {
    get() {
      return this._json.contractName || "Contract";
    },
    set(val) {
      this._json.contractName = val;
    }
  },

  gasMultiplier: {
    get() {
      if (this._json.gasMultiplier === undefined) {
        this._json.gasMultiplier = 1.25;
      }
      return this._json.gasMultiplier;
    },
    set(val) {
      this._json.gasMultiplier = val;
    }
  },
  timeoutBlocks: {
    get() {
      return this._json.timeoutBlocks;
    },
    set(val) {
      this._json.timeoutBlocks = val;
    }
  },
  autoGas: {
    get() {
      if (this._json.autoGas === undefined) {
        this._json.autoGas = true;
      }
      return this._json.autoGas;
    },
    set(val) {
      this._json.autoGas = val;
    }
  },
  numberFormat: {
    get() {
      if (this._json.numberFormat === undefined) {
        this._json.numberFormat = "BN";
      }
      return this._json.numberFormat;
    },
    set(val) {
      const allowedFormats = ["BigNumber", "BN", "String"];

      const msg =
        `Invalid number format setting: "${val}": ` +
        `valid formats are: ${JSON.stringify(allowedFormats)}.`;

      if (!allowedFormats.includes(val)) throw new Error(msg);

      this._json.numberFormat = val;
    }
  },
  abi: {
    get() {
      return this._json.abi;
    },
    set(val) {
      this._json.abi = val;
    }
  },
  metadata() {
    return this._json.metadata;
  },
  network() {
    const network_id = this.network_id;

    if (network_id == null) {
      var error = `${
        this.contractName
      } has no network id set, cannot lookup artifact data. Either set the network manually using ${
        this.contractName
      }.setNetwork(), run ${
        this.contractName
      }.detectNetwork(), or use new(), at() or deployed() as a thenable which will detect the network automatically.`;

      throw new Error(error);
    }

    // TODO: this might be bad; setting a value on a get.
    if (this._json.networks[network_id] == null) {
      var error = `${
        this.contractName
      } has no network configuration for its current network id (${network_id}).`;

      throw new Error(error);
    }

    const returnVal = this._json.networks[network_id];

    // Normalize output
    if (returnVal.links == null) {
      returnVal.links = {};
    }

    if (returnVal.events == null) {
      returnVal.events = {};
    }

    return returnVal;
  },
  networks() {
    return this._json.networks;
  },
  address: {
    get() {
      const address = this.network.address;

      if (address == null) {
        const error = `Cannot find deployed address: ${
          this.contractName
        } not deployed or address not set.`;
        throw new Error(error);
      }

      return address;
    },
    set(val) {
      if (val == null) {
        throw new Error(`Cannot set deployed address; malformed value: ${val}`);
      }

      const network_id = this.network_id;

      if (network_id == null) {
        const error = `${
          this.contractName
        } has no network id set, cannot lookup artifact data. Either set the network manually using ${
          this.contractName
        }.setNetwork(), run ${
          this.contractName
        }.detectNetwork(), or use new(), at() or deployed() as a thenable which will detect the network automatically.`;

        throw new Error(error);
      }

      // Create a network if we don't have one.
      if (this._json.networks[network_id] == null) {
        this._json.networks[network_id] = {
          events: {},
          links: {}
        };
      }

      // Finally, set the address.
      this.network.address = val;
    }
  },
  transactionHash: {
    get() {
      return this.network.transactionHash;
    },
    set(val) {
      this.network.transactionHash = val;
    }
  },
  links() {
    if (!this.network_id) {
      const error = `${
        this.contractName
      } has no network id set, cannot lookup artifact data. Either set the network manually using ${
        this.contractName
      }.setNetwork(), run ${
        this.contractName
      }.detectNetwork(), or use new(), at() or deployed() as a thenable which will detect the network automatically.`;

      throw new Error(error);
    }

    if (this._json.networks[this.network_id] == null) {
      return {};
    }

    return this.network.links || {};
  },
  events() {
    let events;

    if (this._json.networks[this.network_id] == null) {
      events = {};
    } else {
      events = this.network.events || {};
    }

    // Merge abi events with whatever's returned.
    const abi = this.abi;

    abi.forEach(item => {
      if (item.type !== "event") return;

      if (item.signature) {
        events[item.signature] = item;
      } else {
        let signature = `${item.name}(`;

        item.inputs.forEach(({ type }, index) => {
          signature += type;

          if (index < item.inputs.length - 1) {
            signature += ",";
          }
        });

        signature += ")";

        const topic = web3Utils.keccak256(signature);

        events[topic] = item;
      }
    });

    return events;
  },
  binary() {
    return utils.linkBytecode(this.bytecode, this.links);
  },
  deployedBinary() {
    return utils.linkBytecode(this.deployedBytecode, this.links);
  },

  // deprecated; use bytecode
  unlinked_binary: {
    get() {
      return this.bytecode;
    },
    set(val) {
      this.bytecode = val;
    }
  },
  // alias for unlinked_binary; unlinked_binary will eventually be deprecated
  bytecode: {
    get() {
      return this._json.bytecode;
    },
    set(val) {
      this._json.bytecode = val;
    }
  },
  deployedBytecode: {
    get() {
      let code = this._json.deployedBytecode;

      if (code.indexOf("0x") !== 0) {
        code = `0x${code}`;
      }

      return code;
    },
    set(val) {
      let code = val;

      if (val.indexOf("0x") !== 0) {
        code = `0x${code}`;
      }

      this._json.deployedBytecode = code;
    }
  },
  sourceMap: {
    get() {
      return this._json.sourceMap;
    },
    set(val) {
      this._json.sourceMap = val;
    }
  },
  deployedSourceMap: {
    get() {
      return this._json.deployedSourceMap;
    },
    set(val) {
      this._json.deployedSourceMap = val;
    }
  },
  source: {
    get() {
      return this._json.source;
    },
    set(val) {
      this._json.source = val;
    }
  },
  sourcePath: {
    get() {
      return this._json.sourcePath;
    },
    set(val) {
      this._json.sourcePath = val;
    }
  },
  legacyAST: {
    get() {
      return this._json.legacyAST;
    },
    set(val) {
      this._json.legacyAST = val;
    }
  },
  ast: {
    get() {
      return this._json.ast;
    },
    set(val) {
      this._json.ast = val;
    }
  },
  compiler: {
    get() {
      return this._json.compiler;
    },
    set(val) {
      this._json.compiler = val;
    }
  },
  // Deprecated
  schema_version() {
    return this.schemaVersion;
  },
  schemaVersion() {
    return this._json.schemaVersion;
  },
  // deprecated
  updated_at() {
    return this.updatedAt;
  },
  updatedAt() {
    try {
      return this.network.updatedAt || this._json.updatedAt;
    } catch (e) {
      return this._json.updatedAt;
    }
  },
  userdoc() {
    return this._json.userdoc;
  },
  devdoc() {
    return this._json.devdoc;
  }
};

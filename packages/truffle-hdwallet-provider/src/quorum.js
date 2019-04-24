const Subprovider = require("web3-provider-engine/subproviders/subprovider");
const RLP = require("rlp");
const { execSync, exec } = require("child_process");

class QuorumSubprovider extends Subprovider {
  constructor(signTransaction) {
    super();
    this.signTransaction = signTransaction;
  }

  // Convert eth_sendTransaction requests to eth_sendRawPrivateTransaction
  // when privateFor param present in the payload
  handleRequest(payload, next, end) {
    if (
      payload.method === "eth_sendTransaction" &&
      payload.params[0].privateFor
    ) {
      // not sure if needed
      const setPrivate = rawTransaction => {
        const decoded = RLP.decode(rawTransaction);
        const compareTo = Buffer.from("1c", "hex");
        if (decoded[6].compare(compareTo) === 0)
          decoded[6] = Buffer.from("26", "hex");
        else decoded[6] = Buffer.from("25", "hex");
        return RLP.encode(decoded);
      };

      const txParams = payload.params[0];
      this.signTransaction(txParams, (err, rawTx) => {
        payload.method = "eth_sendRawPrivateTransaction";

        // not clear whether we need to do this or in what order
        //rawTx = setPrivate(rawTx)
        //rawTx = `0x${rawTx.toString("hex")}`
        //
        // also not clear whether we need to convert rawTx or txParams.data to base64 before the curl call or in what order
        //rawTx = new Buffer(rawTx, 'base64').toString('hex');
        //rawTx = `0x${rawTx.toString("hex")}`
        //
        // this is the curl the tessera-swagger API docs outline to do (not cure if they're up-to-date)
        //execSync(`curl -X POST "http://localhost:22000/storeraw" -H "accept: application/json" -H "Content-Type: application/json" -d "{ \"payload\": [ \"string\" ], \"from\": [ \"string\" ]}"`)
        payload.params[0] = rawTx;
        payload.params.push({ privateFor: txParams.privateFor });
        console.log("final payload:", payload);

        // alternative curl call, not sure if correct or in what order this needs to be called
        //execSync(`curl -X POST "http://localhost:22000/storeraw" -H "accept: application/json" -H "Content-Type: application/json" -d "{ "payload": [ "${new Buffer(rawTx, 'base64').toString('hex')}" ], "from": "${txParams.from}", "privateFor": [ ${txParams.privateFor} ] }"`)// "{ "key": "${txParams.privateFor}" }"`)

        // example curl call to log output with
        exec(
          `curl -X POST "http://localhost:22000/storeraw" -H "accept: application/json" -H "Content-Type: application/json" -d { "key": "${rawTx}" }`,
          (err, stdout, stderr) => {
            console.log(err);
            console.log(stderr);
            console.log(stdout);
          }
        );
        next();
      });
    } else {
      next();
    }
  }
}

module.exports = QuorumSubprovider;

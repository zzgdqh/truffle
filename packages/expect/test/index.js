const expect = require("../");
const assert = require("assert");

// object being testing
const options = {
  example: "exists",
  another: 5
};

describe("expect.options", () => {
  it("throws when given key values are undefined", () => {
    assert.throws(
      () => expect.options(options, ["expected_key", "other_expected_key"]),
      "Should have thrown!"
    );
  });
});

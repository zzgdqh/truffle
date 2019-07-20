# Truffle Decoder
This module provides interfaces for decoding contract state, transaction
calldata, and events.

It's split into two classes: The wire decoder and the contract decoder.  The wire
decoder is associated to the project as a whole and decodes transaction calldata
and events.  The contract decoder, by contrast, is associated to a specific
deployed contract instance.  It has all the capabilities of the wire decoder,
but in addition can decode its associated contract's state.

In addition, in the case that the contract does not include a `deployedBytecode`
field in its artifact, which can hinder decoding certain things, the contract
decoder can sometimes work around this where the wire decoder cannot.

This documentation describes the current state of the decoder, but you should
expect to see improvements soon.

## Usage

### Initialization

To use either decoder, first import `TruffleDecoder` from `truffle-decoder`.

To obtain a `TruffleWireDecoder`, use
```
let wireDecoder = await TruffleDecoder.forProject(contracts, provider);
```
where `contracts` is an array of all of your project's `ContractObject`s (i.e.,
artifacts), and `provider` is the `web3` provider to use.

A `TruffleContractDecoder` for a specific contract can be obtained in one of two
ways.  The simplest way is to do
```
let contractDecoder = await TruffleDecoder.forContract(
  contract: ContractObject,
  relevantContracts: ContractObject[],
  provider: Provider,
  address?: string
);
```

Here `contract` is the artifact for the contract you want to decode,
`relevantContracts` is an array of all other artifacts from your project (it is
OK if this includes `contract` itself too), `provider` is as above, and
optionally `address` is the address of the contract instance you want to decode.

If `address` is not supplied, the address will be autodetected on initialization
based on the network and artifact.

Finally, if you already have a `wireDecoder` for your project and want to save a
bit of recomputation, you can do

```
let contractDecoder = await TruffleDecoder.forContractWithDecoder(
  contract: ContractObject,
  wireDecoder: TruffleWireDecoder,
  address?: string
);
```

*Warning*: At present, all of these methods can throw exceptions, indicating
that initialization of the decoder has failed, so be prepared to catch these.

This will be remedied in future versions of the decoder, which will instead
simply fall back into a lower-capability mode if something goes wrong during
initialization.

### Methods

What follows is a listing of the decoding methods and their output formats.

Note that the output format for the decoding of individual values is described
elsewhere, but we will summarize it below.

Note: **All** of these methods are `async` except where noted otherwise.

#### Methods common to the wire decoder and the contract decoder

###### decodeTransaction

The `decodeTransaction` method takes a web3 `Transaction` object and returns a
`DecodedTransaction` object, which is the same thing but with an additional
`decoding` field.  This field holds an object which can be of one of four forms:

1. A function decoding:
```
interface FunctionDecoding {
  kind: "function";
  class: CodecUtils.Types.ContractType;
  arguments: AbiArgument[];
  name: string;
  selector: string;
  decodingMode: DecodingMode;
}
```

Here, `kind` is always `"function"`; `class` is a `Type` object representing the
class of the contract that was called (see the end for more about `Type`
objects); `arguments` is the array of decoded arguments; `name` is the name of
the function; and `selector` is its selector.

Each decoded argument is given as an object with two fields, `name` and
`value`; `name` is of course the name of the parameter, but it will be excluded
if the parameter is nameless.  The `value` field is a `Result` object containing
the actual decoded value; see the end for more about these.

There is also the `decodingMode` field.  This field is either `"abi"` (to
indicate that decoding was performed based on the contracts' ABIs alone) or
`"full"` (to indicate that additional information from Solidity was used where
possible).  Currently, only `"full"` mode is implemented, so this field will
always be `"full"`.

2. A constructor decoding:
```
export interface ConstructorDecoding {
  kind: "constructor";
  class: CodecUtils.Types.ContractType;
  arguments: AbiArgument[];
  bytecode: string;
  decodingMode: DecodingMode;
}
```

This is similar to the function decoding, except that there is no name or
selector, and instead there is `bytecode`, which contains the bytecode for the
constructor with the arguments *excluded*.

*Remark*: In the future this case may also include further information about the
linked libraries of the contract being constructed by this transaction; however,
this feature will likely not be ready for quite some time.

3. A fallback decoding:
```
export interface FallbackDecoding {
  kind: "fallback";
  class: CodecUtils.Types.ContractType;
  data: string;
  decodingMode: DecodingMode;
}
```

This case indicates that the data for the call did not match the contract's ABI,
leaving its fallback function (if it exists) to be invoked.  The `data` field
contains a copy of the data.  Obviously, there is no `arguments` field in this
case.

4. An unknown decoding:
```
export interface UnknownDecoding {
  kind: "unknown";
  decodingMode: DecodingMode;
  data: string;
}
```

This is used when it was not even possible to determine the class of the
contract that the transaction was directed to (or constructing).  It is similar
to a fallback decoding.

###### decodeLog

The `decodeLog` method functions similarly to `decodeTransaction`; it takes a
web3 `Log` object and returns a `DecodedLog`, which consists of the same
information but with an additionnal `decodings` field.  Note, however, the
plural; logs may be ambiguous, so `decodings` is an array of decodings.  As a
result there is no equivalent for logs of the `UnknownDecoding` case above; if a
log cannot be decoded, its `decodings` array will simply be empty.

Each decoding can have one of two forms:

1. A non-anonymous event decoding:
```
export interface EventDecoding {
  kind: "event";
  class: CodecUtils.Types.ContractType;
  arguments: AbiArgument[];
  name: string;
  selector: string;
  decodingMode: DecodingMode;
}
```

As with `decodeTransaction`, we have `kind`, `class` (the class of the contract
that emitted the event, according to this decoding; again, see below about
`Type` objects), `arguments`, `name`, `selector`, and `decodingMode`.  You can
see the documentation for `decodeTransaction` for more about these.

Note that the objects in the `arguments` array now have one additional property:
`indexed`, a boolean indicating whether that parameter is indexed or not.

2. An anonymous event decoding:
```
export interface AnonymousDecoding {
  kind: "anonymous";
  class: CodecUtils.Types.ContractType;
  arguments: AbiArgument[];
  name: string;
  decodingMode: DecodingMode;
}
```

This is similar to the above case, except of course that no selector is
included.

###### decodeLogs

This method is similar to `decodeLog`; it takes an array of `Log`s, decodes them,
and returns the array of `DecodedLog`s.

###### events

This method lists all events (as `DecodedLog`s) meeting certain criteria.  It
takes a single parameter, an options object:
```
export interface EventOptions {
  name?: string;
  fromBlock?: BlockType;
  toBlock?: BlockType;
  address?: string;
}
```

(More options will be added in the future.)

The current options are as follows:

1. `fromBlock`, `toBlock`: The bounds on the blocks to search; both of these
default to `"latest"`.  They can be specified the same way blocks are
specified in web3.

2. `address`: If given, restricts to events with the given address.  If left
undefined, does not filter.  **Note**: If `events` is called from the contract
decoder, `address` will instead default to the address of the contract being
decoded; however, this may be overwritten, including by specifying it as
`undefined` to turn off address filtering.

3. `name`: If given, restricts to events with the given name.  (This may include anonymous
events with that name.)  This has two effects.  Firstly, in each `decodings`
array, only decodings for events with the given name will be included.
Secondly, any logs having no decodings with the given name will be filtered out
entirely.

#### Methods specific to the contract decoder

##### variable

```
await contractDecoder.variable(variable: string | number, block: BlockNumber = "latest")
```

This method is used to decode a state variable of the contract; the result is
returned as a `Result` (about which see below).  The variable can be given
either by name, or by its numeric ID if you know it (either as a number or as a
numeric string).

Optionally, you may specify a block (it defaults to `"latest"`) in order to
inspect the value of the variable at a time other than the present.

Note that the decoder does not keep track of mapping keys.  In order to decode
mappings, you will need to use the `watchMappingKey` method discussed below.

**Note**: Due to technical limitations, it is not presently possible to
meaningfully decode internal function pointers via `TruffleDecoder` (properly
decoding these is for now a debugger-only feature).  We are hoping to remedy
this eventually, however, this one will probably be a long time.  See the final
section for more about this.

##### state

Returns the state of the contract, in the following form:
```
export interface ContractState {
  name: string;
  balance: BN;
  nonce: BN;
  code: string;
  variables: {
    [name: string]: Values.Result
  };
};
```

The `name` field is the contract name, `balance` is the balance in Wei, `nonce`
the nonce (a.k.a transaction count), `code` the bytecode as a hex string,
and `variables` an object mapping variable names to their decoded values (as
`Result`s).

Optionally, you may specify a block in order to inspect the state of the
contract at a time other than the present.

Again, the caveat about mappings applies.

##### watchMappingKey

**This method is not `async`**.

**Note**: This method is going to have some slight changes to what input it
accepts soon, but not in a way that should break anything.

**Note**: This method presently does not check its inputs.  This will be
fixed in the future, at which point invalid inputs will cause an exception.

This method is used to register mapping keys so that decoded mappings will
include them.

The method takes a variable -- as with `variable`, this may be specified by name
or by numeric ID -- followed by a series of indices.

This is perhaps explained best by example.  Suppose `stringMap` is a mapping of
type `mapping(string => uint)`.  Then one may call
`watchMappingKey("stringMap", "a")` to watch `stringMap["a"]`.

However, the method is not limited to top-level mappings.  Suppose we have the
following declarations in our contract:

```
struct HasMap {
  uint x;
  mapping(bytes => address) theMap;
}

mapping(int => mapping(bytes4 => uint)) mapMap;
mapping(bool => string)[] mapArray;
HasMap hasMap;
```

Then one could use `watchMappingKey("mapMap", -1, "0xdeadbeef")` to watch
`mapMap[-1][0xdeadbeef]`; one could use `watchMappingKey("mapArray", 3, true)`
to watch `mapArray[3][true]`; and one could use
`watchMappingKey("hasMap", "theMap", "0x212121")` to watch
`hasMap.theMap[hex'212121']`.

This nesting may go any number of levels deep, so long as you keep providing
indices (for mappings or arrays) or member names (for structs).  (Struct members
may also be given by their numeric ID, or a string containing such, if you
happen to know these.)  I'm not going to detail the exact formats that are
accepted, as it's probably basically what you expect, but if you really want you
can see the code comments for details.  (Although, as mentioned in the note
above, I'm going to change this soon -- though, again, it should still be
basically what you expect; only some details will change.)

Also, note that watching a mapping key also automatically watches all of its
mapping key ancestors (or else watching that mapping key wouldn't do very much).
So in the example above, watching `mapMap[-1][0xdeadbeef]` will also watch
`mapMap[-1]`.

This works with more complex examples too; for instance, if one has a variable
```
mapping(string => mapping(int => bytes)[5]) complexMap
```
then watching `complexMap["hi"][3][-8]` also automatically watches
`complexMap["hi"]`.  (You may be wondering, what about `complexMap["hi"][3]`?
The answer is, `3` is acting as an array index there, not a mapping key, so
there's no need to explicitly watch it so long as its parent `complexMap["hi"]`
is watched.)

##### unwatchMappingKey

**This method is not `async`**.  Also, see the other notes on `watchMappingKey`,
as they also apply here.

This method is used to unregister mapping keys so that decoded mappings will not
include them.

The usage is similar to `watchMappingKey`, described above.  Note that
unwatching a key will also unwatch all its mapping key descendants; so if you
had previously watched `someMapping["a"]["b"]` and you unwatch
`someMapping["a"]`, this will also unwatch `someMapping["a"]["b"]`.

### Decoded variables: `Type`s and `Result`s

This will be a brief explanation of the format of decoded variables.  For full
detail, I recommend seeing the interface declarations in
`truffle-codec-utils/types/types.ts` and `truffle-codec-utils/types/values.ts`.
(And, if you really want, the errors in `truffle-codec-utils/types/errors.ts`.)

Each decoded variable is a `Result`.  A `Result` has the following fields:

1. `type`: This is a `Type` object describing the value's type.  Each `Type`
has a `typeClass` field describing the overall broad type, such as `"uint"` or
`"bytes"`, together with additional information that gives the specific type.  I
won't go into further detail about these here; I recommend simply looking at the
aforementioned `types.ts` to see how these work.

2. `kind`: This is either `"value"`, in which case the `Result` is a `Value`, or
`"error"`, in which case the `Result` is an `ErrorResult`.  In the former case,
there will be a `value` field containing the decoded value.  In the latter case,
there will be an `error` field indicating what went wrong.  *Warning*: When
decoding a complex type, such as an array, mapping, or array, getting a kind of
`"value"` does not necessarily mean the individual elements were decoded
successfully.  Even if the `Result` for the array (mapping, struct) as a whole
has kind "value"`, the elements might still have kind `"error"`.

3. `value`: As mentioned, this is included when `kind` is equal to `"value"`.
It contains information about the actual decoded value.  I recommend seeing the
aformentioned `values.ts` for more information.

4. `error`: The alternative to `value`.  Generally includes information about
the raw data that led to the error.  See the aforementioned `errors.ts` for more
information.

5. `reference`: This field is a debugger-only feature so I'll skip explaining it
here; it won't come up with `TruffleDecoder`.  (It's not even implemented yet
anyway.)

Rather than explain the format in detail -- you can see the code for that -- I'd
instead like to take a moment to answer the question: What counts as a value,
and what counts as an error?

In general, the answer is that anything that can be generated via Solidity alone
(i.e. no assembly), and without making use of compiler bugs, is a value, not an
error.  That means that, for instance, the following things are values, not
errors:

1. A variable of contract type whose address does not actually hold a contract
of that type;

2. An external function pointer that does not correspond to a valid function;

3. A string containing invalid UTF-8;

etc.

By contrast, the following *are* errors:

1. A `bool` which is neither `false` (0) nor `true` (1);

2. An `enum` which is out of range;

etc.

(You may be wondering about the enum case here, because if you go sufficiently
far back, to Solidity 0.4.4 or earlier, it *was* possible to generate
out-of-range enums without resorting to assembly or compiler bugs.  However, the
decoder is not intended to support Solidity older than 0.4.9 (except in ABI-only
mode, which doesn't know about enums), so we consider it an error.)

There are two special cases here that are likely worthy of note.

Firstly, as noted above, internal function pointers currently can't be
meaningfully decoded via `TruffleDecoder`.  However, they decode to a bare-bones
value, not an error, as it is (in a sense) our own fault that we can't decode
these, so it doesn't make sense to report an error, which would mean that
something is wrong with the encoded data itself.  This value that it decodes to
will give the program counter values it corresponds to, but will not include the
function name or defining class, as `TruffleDecoder` is not presently capable of
that.

(Also, note that when using the debugger, an invalid internal function pointer
will decode to an error.  However, when using `TruffleDecoder`, we have no way
of discerning whether the pointer is valid or not, so internal function pointers
will always decode to a value, if an uninformative one.)

Secondly, at present, any attempt to decode anything of a `fixed` or `ufixed`
type results in an error, not a value.  This does not meet our criterion above
for being an error -- as described in the previous paragraph, the failure to
decode is our own fault so it ought to be a value -- but we simply don't have a
value format ready yet.  However, we're intending to remedy this soon.

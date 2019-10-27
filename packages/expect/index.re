let options = (options, expectedKeys) =>
  Array.iter(
    key =>
      if (options[key] == None) {
        Js.Exn.raiseError(
          {j|Expected parameter $key not passed to function.|j},
        );
      },
    expectedKeys,
  );

let one = (options, expectedKeys) => {
  let found = expectedKeys |> Js.Array.filter(key => options[key] != None);
  if (Array.length(found) < 1) {
    Js.Exn.raiseError(
      {j|Expected one of the following parameters, but found none: $expectedKeys|j},
    );
  };
};

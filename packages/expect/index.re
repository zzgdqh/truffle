let options = (options, expected_keys) =>
  Array.iter(
    key =>
      if (options[key] == None) {
        Js.Exn.raiseError(
          {j|Expected parameter $key not passed to function.|j},
        );
      },
    expected_keys,
  );

let one = (options, expected_keys) => {
  let found = expected_keys |> Js.Array.filter(key => options[key] != None);
  if (Array.length(found) < 1) {
    Js.Exn.raiseError(
      {j|Expected one of the following parameters, but found none: $expected_keys|j},
    );
  };
};

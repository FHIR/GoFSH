// this alias is valid
Alias: $valid = http://example.org/CodeSystem/valid
// this alias is invalid, since the name contains |
Alias: $not|valid = http://example.org/CodeSystem/not-valid
// this alias is valid
Alias: somethingGood = http://example.org/ValueSet/something-good
// this alias is invalid, since it is already defined
Alias: $valid = http://example.org/already-defined
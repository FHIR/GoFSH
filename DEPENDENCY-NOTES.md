As of 2024 August 22:

The `npm outdated` command reports the following dependencies as outdated.
They are not being updated at this time for the reasons given below:

- `@types/node`: don't update until Node 22 is LTS version (currently Node 20).
- `chalk`: major version 5 causes problems for jest. Keep updated to latest 4.x release.
- `flat`: major version 6 is an esmodule.

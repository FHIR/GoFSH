As of 2025 March 28:

The `npm outdated` command reports the following dependencies as outdated.
They are not being updated at this time for the reasons given below:

- `@types/node`: stay on v22 until we are ready to move to v24. Currently, Node 24 segfaults during SUSHI tests on macos in GitHub Actions.
- `chalk`: major version 5 causes problems for jest. Keep updated to latest 4.x release.
- `commander`: major version 14 requires Node 20 and higher. Wait until community has had sufficient time to move off Node 18.
- `flat`: major version 6 is an esmodule.
- `ini`: major version 6 requires Node 20 and higher. Wait until community has had sufficient time to move off Node 18.


# Introduction

Thank you for contributing to Stacks-Editor! To ensure your contributions are accepted as quickly as possible, please adhere to the guidelines below.

Importantly, please observe the Stack Exchange [Code of Conduct](https://meta.stackexchange.com/conduct) in all of your interactions.

# tl;dr

* Be respectful and follow our [Code of Conduct](https://meta.stackexchange.com/conduct)
* PRs should be short and focus on a single feature
* All added code must be documented and unit tested. No exceptions.
* All code needs to pass our ESLint and Prettier checks
* All commit messages must adhere to [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)

# Submitting a PR

If you're adding brand new functionality that is not represented by an existing issue, _please open a new issue first_. This allows us to discuss whether it is an appropriate feature to add to the core codebase, potentially saving both your and the reviewer's time.

All PRs should be short, sweet and to the point. Long PRs are less likely to be reviewed in a timely manner, so keep your PRs focused on one major change at a time.

All PRs **must** include unit tests for all updated / changed functionality. You should also include end-to-end tests when appropriate. In the extremely unlikely event that your PR doesn't need unit tests, please state so in the PR description along with your reasoning.

All added functions must be documented in [TSDoc](https://tsdoc.org/) (`/** ... */`) format. If you're updating parameters or the return type on existing functions that don't have documentation, it is your responsibility to add it.

All code **must** adhere to our ESLint and Prettier rules. We have GitHub actions set up to auto-check your PRs for you. Additionally, the project is set up for development in [VS Code](https://code.visualstudio.com/). If you install the extensions under "Workspace recommendations", your local dev environment will automatically adhere to our linting and formatting rules.

All commit messages must adhere to the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) format. This project is set up to auto-install a Git hook to check your commit message formatting. By adhering to our commit message rules, we are able to effortlessly generate robust version changelogs.

# How to report a bug / request a new feature

If you find a severe security vulnerability, __do NOT open an issue__. Please submit it according to our [vulnerability reporting guidelines](https://stackexchange.com/about/security).

When opening a new issue, choose `Bug report` for reporting a problem with the project and `Feature request` when you would like new functionality added. When in doubt between the two, choose the one you feel is the most applicable. We'll update the labels on the issue if we feel differently.

Adding labels beyond the auto-added "bug"/"enhancement" labels is not required, but would be appreciated. We'll add/update all PR labels once triaged.

Please fill out the issue prompt _in full_ before submitting. If you feel a section does not apply to the issue, fill it in with `N/A`.

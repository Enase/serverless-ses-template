# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

<!--
## [Unreleased]
- Unreleased list of features goes here...
-->

## [6.1.0] - 2024-01-xx

### Breaking Changes
- **Modified Autodeploy Behavior**: The behavior of auto-deploy has been updated.
Starting now, when the `disableAutoDeploy` configuration value is set to `false`,
the plugin will automatically remove templates during the `before:remove:remove` serverless internal event.
This change enhances stack management and helps prevent unintended template retention
when executing the `sls remove` command to remove the AWS CloudFormation stack.
[#147](https://github.com/Enase/serverless-ses-template/pull/147)

### Changed
- Dependencies updated

## [6.0.0] - 2023-09-26

### Breaking Changes
- **Migration to TypeScript**: The project has been refactored using TypeScript. [Learn about our motivation and the detailed changes](https://github.com/Enase/serverless-ses-template/discussions/61).
- **Pure ESM Package**: Plugin transitioned to a pure ESM module. If you're unfamiliar with this, please [consult this guide](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c) to understand the implications.
- **Serverless Version Requirement**: Ensure you are using `serverless` version [v3.2.0](https://github.com/serverless/serverless/releases/tag/v3.2.0) or above, as this is now the minimum supported version.

## [5.1.0] - 2024-01-xx

### Breaking Changes
- **Modified Autodeploy Behavior**: The behavior of auto-deploy has been updated.
Starting now, when the `disableAutoDeploy` configuration value is set to `false`,
the plugin will automatically remove templates during the `before:remove:remove` serverless internal event.
This change enhances stack management and helps prevent unintended template retention
when executing the `sls remove` command to remove the AWS CloudFormation stack.
[#147](https://github.com/Enase/serverless-ses-template/pull/147)

### Changed
- Dependencies updated

## [5.0.2] - 2023-09-26

### Breaking Changes
- **Migration to TypeScript**: The project has been refactored using TypeScript. [Learn about our motivation and the detailed changes](https://github.com/Enase/serverless-ses-template/discussions/61).
- **Serverless Version Requirement**: Ensure you are using `serverless` version [v3.2.0](https://github.com/serverless/serverless/releases/tag/v3.2.0) or above, as this is now the minimum supported version.

## [4.0.7] - 2023-06-27

### Fixed
- Resolved serverless configuration issue for plugin usage without `custom` node

### Changed
- Dependencies updated

### Added
- dependabot configuration


## [4.0.6] - 2023-04-06

### Added
- `removeMissed` configuration flag

### Changed
- Dependencies updated


## [4.0.5] - 2022-05-18

### Fixed
- [Invalid PageToken](https://github.com/Enase/serverless-ses-template/issues/31) issue while deploy

## [4.0.4] - 2022-04-08

### Fixed
- Display falsy values in red for cli SES

### Changed
- Dependencies updated (security vulnerabilities)

## [4.0.3] - 2022-02-08

### Fixed
- Serverless ver 2 support

## [4.0.2] - 2022-02-08

### Fixed
- Wrong `chalk` version

## [4.0.1] - 2022-02-07

### Added
- Serverless SES service changes and status info added to "[Service information](https://www.serverless.com/framework/docs/guides/plugins/cli-output#service-information)"
- `sls info` command support

### Changed
- SES API version updated to [SESV2](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SESV2.html)
- Logs and messages improved

## [4.0.0] - 2022-02-01

### Added
- Serverless Framework v3 support

## [3.0.3] - 2021-04-15

### Added
- Type definitions for CLI options for [Serverless 3.x compatibility](https://www.serverless.com/framework/docs/deprecations/#cli-options-extensions-type-requirement).
  Fixes [#22](https://github.com/Enase/serverless-ses-template/issues/22)

### Changed
- Dependencies updated (security vulnerabilities)

## [3.0.2] - 2020-12-17

### Fixed
- Default plugin options are not initialized. Fixes [#20](https://github.com/Enase/serverless-ses-template/issues/20)

## [3.0.1] - 2020-12-03

### Improvement
- Unnecessary files are not included in release anymore. Added `files` section in `package.json`.

### Docs
- Added extended example: [Plugin integration with asset management](examples/cloud-front-service/asset-management)

## [3.0.0] - 2020-12-03

### Breaking Changes
- Config definition updated
- Dropped `serverless-aws-alias` plugin support

### Added
- Ability to set deploy hook
- Config validation

### Changed
- Region verification removed

## [2.0.0] - 2020-07-15

### Breaking Changes
- Drop Node.js 8 support

### Changed
- List of supported regions updated according to [AWS RPS](https://aws.amazon.com/about-aws/global-infrastructure/regional-product-services/)

## [1.3.3] - 2020-06-10

### Changed
- List of supported regions updated according to [AWS RPS](https://aws.amazon.com/about-aws/global-infrastructure/regional-product-services/)

## [1.3.2] - 2020-03-12

### Changed
- SES template deploy process moved to "before deploy" stage.

## [1.3.1] - 2020-03-12

### Added
- Ability to disable auto deploy with `sesTemplatesDisableAutoDeploy` configuration flag.

### Changed
- SES template deploy process moved from "packaging" to "after deploy" stage.

## [1.3.0] - 2020-02-26

### Breaking Changes
- Ability to load template [configuration in any async way](https://github.com/Enase/serverless-ses-template/issues/15) (eg. from DB or API). \
Template configuration file must return an async function now. Example see [here](examples/cloud-front-service/asset-management/ses-email-templates/index.js).

### Added
- List of supported regions updated according to [AWS RPS](https://aws.amazon.com/about-aws/global-infrastructure/regional-product-services/)

## [1.2.6] - 2019-12-16

### Added
- List of supported regions updated according to [AWS RPS](https://aws.amazon.com/about-aws/global-infrastructure/regional-product-services/)
- Ability to pass template configuration file path as CLI argument named `sesTemplateConfig`.

## [1.2.5] - 2019-10-15

### Changed
- FIX: [Variable refs aren't resolved](https://github.com/Enase/serverless-ses-template/issues/12)

## [1.2.4] - 2019-09-20

### Changed
- Dependencies updated (security vulnerabilities)

## [1.2.3] - 2019-07-30

### Changed
- Dependencies updated (security vulnerabilities)

## [1.2.2] - 2019-06-05

### Changed
- Readme.md link fixed

## [1.2.1] - 2019-06-05

### Changed
- Dependencies updated in order to get rid of npm security vulnerability warning
- License added + readme updated

## [1.2.0] - 2019-02-27

### Changed
- [Do not add alias to template names if alias plugin isn't used](https://github.com/Enase/serverless-ses-template/pull/11)

## [1.1.0] - 2019-02-22

### Added
- [Custom region parameter + ability to filter templates for list function](https://github.com/Enase/serverless-ses-template/pull/9) \
    see details in pull request description

## [1.0.7] - 2019-02-16

### Added
- [Ability to list email templates](https://github.com/Enase/serverless-ses-template/pull/7)

## [1.0.6] - 2019-01-17

### Changed
- [Fixed Promise.all not actually waiting on the array of arrays](https://github.com/Enase/serverless-ses-template/pull/6)

## [1.0.5] - 2018-09-24

### Changed
- [Remove command shortcuts](https://github.com/Enase/serverless-ses-template/pull/4) \
   Shortcuts deleted for all the commands.

## [1.0.4] - 2018-09-24

### Changed
- [--keep-missed flag replaced by --remove-missed](https://github.com/Enase/serverless-ses-template/pull/2) \
   Plugin does not remove templates those are not present in your configuration file by default.

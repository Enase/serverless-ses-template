# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

<!--
## [Unreleased]
- Unreleased list of features goes here...
-->

## [3.0.3] - 2021-04-15

### Added
- Type definitions for CLI options for [Serverless 3.x compatibility](https://www.serverless.com/framework/docs/deprecations/#cli-options-extensions-type-requirement).
  Fixes [#22](https://github.com/haftahave/serverless-ses-template/issues/22)

### Changed
- Dependencies updated (security vulnerabilities)

## [3.0.2] - 2020-12-17

### Fixed
- Default plugin options are not initialized. Fixes [#20](https://github.com/haftahave/serverless-ses-template/issues/20)

## [3.0.1] - 2020-12-03

### Improvement
- Unnecessary files are not included in release anymore. Added `files` section in `package.json`.

### Docs
- Added extended example: [Plugin integration with asset management](examples/asset-management)

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
- Ability to load template [configuration in any async way](https://github.com/haftahave/serverless-ses-template/issues/15) (eg. from DB or API). \
Template configuration file must return an async function now. Example see [here](examples/asset-management/ses-email-templates/index.js).

### Added
- List of supported regions updated according to [AWS RPS](https://aws.amazon.com/about-aws/global-infrastructure/regional-product-services/)

## [1.2.6] - 2019-12-16

### Added
- List of supported regions updated according to [AWS RPS](https://aws.amazon.com/about-aws/global-infrastructure/regional-product-services/)
- Ability to pass template configuration file path as CLI argument named `sesTemplateConfig`.

## [1.2.5] - 2019-10-15

### Changed
- FIX: [Variable refs aren't resolved](https://github.com/haftahave/serverless-ses-template/issues/12)

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
- [Do not add alias to template names if alias plugin isn't used](https://github.com/haftahave/serverless-ses-template/pull/11)

## [1.1.0] - 2019-02-22

### Added
- [Custom region parameter + ability to filter templates for list function](https://github.com/haftahave/serverless-ses-template/pull/9) \
    see details in pull request description

## [1.0.7] - 2019-02-16

### Added
- [Ability to list email templates](https://github.com/haftahave/serverless-ses-template/pull/7)

## [1.0.6] - 2019-01-17

### Changed
- [Fixed Promise.all not actually waiting on the array of arrays](https://github.com/haftahave/serverless-ses-template/pull/6)

## [1.0.5] - 2018-09-24

### Changed
- [Remove command shortcuts](https://github.com/haftahave/serverless-ses-template/pull/4) \
   Shortcuts deleted for all the commands.

## [1.0.4] - 2018-09-24

### Changed
- [--keep-missed flag replaced by --remove-missed](https://github.com/haftahave/serverless-ses-template/pull/2) \
   Plugin does not remove templates those are not present in your configuration file by default.

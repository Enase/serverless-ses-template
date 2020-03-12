CHANGELOG
========

# 1.3.2 (12.03.2020)
- Changed: SES template deploy process moved "before deploy" stage.

# 1.3.1 (12.03.2020)
- Changed: SES template deploy process moved from "packaging" to "after deploy" stage.
- Added: Ability to disable auto deploy with `sesTemplatesDisableAutoDeploy` configuration flag.

# 1.3.0 (26.02.2020)
- **BREAKING CHANGE:** Added ability to load template [configuration in any async way](https://github.com/haftahave/serverless-ses-template/issues/15) (eg. from DB or API). \
Template configuration file must return an async function now. Example see [here](ses-email-templates/index.js).
- List of supported regions updated according to [AWS RPS](https://aws.amazon.com/about-aws/global-infrastructure/regional-product-services/)

# 1.2.6 (16.12.2019)
- List of supported regions updated according to [AWS RPS](https://aws.amazon.com/about-aws/global-infrastructure/regional-product-services/)
- Added ability to pass template configuration file path as CLI argument named `sesTemplateConfig`.

# 1.2.5 (15.10.2019)
- FIX: [Variable refs aren't resolved](https://github.com/haftahave/serverless-ses-template/issues/12)

# 1.2.4 (20.09.2019)
- Dependencies updated (security vulnerabilities)

# 1.2.3 (30.07.2019)
- Dependencies updated (security vulnerabilities)

# 1.2.2 (05.06.2019)
- Readme.md link fixed

# 1.2.1 (05.06.2019)
- Dependencies updated in order to get rid of npm security vulnerability warning
- License added + readme updated

# 1.2.0 (27.02.2019)
- [Do not add alias to template names if alias plugin isn't used](https://github.com/haftahave/serverless-ses-template/pull/11)

# 1.1.0 (22.02.2019)
- [Custom region parameter + ability to filter templates for list function](https://github.com/haftahave/serverless-ses-template/pull/9) \
    see details in pull request description

# 1.0.7 (16.02.2019)
- [Ability to list email templates](https://github.com/haftahave/serverless-ses-template/pull/7)

# 1.0.6 (17.01.2019)
- [Fixed Promise.all not actually waiting on the array of arrays](https://github.com/haftahave/serverless-ses-template/pull/6)

# 1.0.5 (24.09.2018)
- [Remove command shortcuts](https://github.com/haftahave/serverless-ses-template/pull/4) \
   Shortcuts deleted for all the commands.

# 1.0.4 (24.09.2018)
- [--keep-missed flag replaced by --remove-missed](https://github.com/haftahave/serverless-ses-template/pull/2) \
   Plugin does not remove templates those are not present in your configuration file by default.

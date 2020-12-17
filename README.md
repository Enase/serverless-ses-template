[![Serverless][ico-serverless]][link-serverless]
[![NPM][ico-npm]][link-npm]
[![npm][ico-npm-downloads]][link-npm]
[![Build Status][ico-build]][link-build]

Template sync plugin for Amazon Simple Email Service
===

A serverless plugin that allows automatically creating, updating and removing
AWS SES Templates using a configuration file and keeps your AWS SES Templates
synced with your configuration file.

**REQUIRES** nodejs 10+

---
**:zap: Features**

- Allows declaring email templates that will be synced in pre-deploy phase
- Allows you to optionally add stage to template names while syncing
- Allows you to list and delete SES template by specified name
---

#### Examples

- [Plugin integration with asset management](examples/asset-management)

#### Installation

`npm install @haftahave/serverless-ses-template`

#### Configuration

* All **@haftahave/serverless-ses-template** configuration parameters are optional

```yaml
# add to your serverless.yml

plugins:
  - '@haftahave/serverless-ses-template'

custom:
  sesTemplates:
    addStage: true                             # Specifies whether to add stage to template name (default false)
    configFile: './custom-config-file/path.js' # Config file path (default './ses-email-templates/index.js')
    deployHook: 'after:deploy:deploy'          # Specifies serverless lifecycle event plugin use to deploy templates (default 'before:deploy:deploy')
    disableAutoDeploy: true                    # Specifies whether to sync templates while sls deploy (default false)
    region: 'us-west-2'                        # Specifies AWS region for SES templates (not required)
```
---

### Template configuration file

Template configuration file should be an async function that returns array of objects (all keys are required):
```javascript
/**
 * @param {Object} serverless - Serverless instance
 * @param {Object} options - runtime options
 * @returns {Promise<{name: string, subject: string, html: string, text}[]>}
 */
module.exports = async (serverless, options) => [{
    name: 'example_name',
    subject: 'Your subject',
    html: '<h1>Hello world!</h1>',
    text: 'Hello world!',
}];
```

Real world example see [here](examples/asset-management/ses-email-templates/index.js).

## Plugin resolves region in the following order:

- CLI argument named `sesTemplatesRegion`  - top priority
- `serverless.yml` custom key named `sesTemplatesRegion`
- CLI argument named `region`
- fallback to default region resolving (first region in first stage defined in serverless.yml)

## Plugin resolves template configuration file path in the following order:

- CLI argument named `sesTemplateConfig`  - top priority
- `serverless.yml` custom key named `sesTemplatesConfigFile`
- fallback to default `./ses-email-templates/index.js`

## Usage and command line options

### Deploy
Run `sls ses-template deploy` in order to sync your email templates.

Optional CLI options:
```
--sesTemplatesRegion The region used to populate your templates. Default: see "Region fallback sequence" in readme.md. [OPTIONAL]
--sesTemplateConfig  Template configuration file path. Default: see "Template configuration file sequence" in readme.md. [OPTIONAL]
--stage        The stage used to populate your templates. Default: the first stage found in your project. [OPTIONAL]
--removeMissed Set this flag in order to remove templates those are not present in your configuration file. [OPTIONAL]
```
---

### List templates
Run `sls ses-template list` in order to list your email templates.

CLI options:

```
--sesTemplatesRegion The region used to list your templates. Default: see "Region fallback sequence" in readme.md. [OPTIONAL]
--filter <string>    Display templates that contain <string>. [OPTIONAL]
```

### Delete template
Run `sls ses-template delete --template template_name_goes_here` in order to delete your email template.

CLI options:

```
--template    The template name you are going to delete [REQUIRED]
--sesTemplatesRegion The region used to populate your templates. Default: see "Region fallback sequence" in readme.md. [OPTIONAL]
--stage       The stage used to populate your templates. Default: the first stage found in your project. [OPTIONAL]
```

## Links

- [Sending Personalized Email Using the Amazon SES API][link-ses-guide]
- [Amazon SES API sendTemplatedEmail][link-ses-sdk]

## License

MIT

[ico-serverless]: http://public.serverless.com/badges/v3.svg
[ico-npm]: https://img.shields.io/npm/v/@haftahave/serverless-ses-template.svg
[ico-npm-downloads]: https://img.shields.io/npm/dt/@haftahave/serverless-ses-template.svg
[ico-build]: https://travis-ci.com/haftahave/serverless-ses-template.svg?branch=master

[link-serverless]: http://www.serverless.com/
[link-npm]: https://www.npmjs.com/package/@haftahave/serverless-ses-template
[link-build]: https://travis-ci.com/haftahave/serverless-ses-template
[link-ses-guide]: https://docs.aws.amazon.com/ses/latest/DeveloperGuide/send-personalized-email-api.html
[link-ses-sdk]: https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SES.html#sendTemplatedEmail-property

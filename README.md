[![Build Status](https://travis-ci.org/haftahave/serverless-ses-template.svg?branch=master)](https://travis-ci.org/haftahave/serverless-ses-template)

Template sync plugin for Amazon Simple Email Service
===

A serverless plugin that allows automatically creating, updating and removing AWS SES Templates using a configuration file and keeps your AWS SES Templates synced with your configuration file.

**REQUIRES** nodejs 8.10+

---
**:zap: Features**

- Allows declaring email templates that will be synced in pre-deploy phase
- Allows you to add stage and alias to template names while sync (supports [serverless-aws-alias](https://github.com/HyperBrain/serverless-aws-alias) plugin)
- Allows you to delete SES template by specified name
---

#### Installation

`npm install @haftahave/serverless-ses-template`

#### Configuration

* All **@haftahave/serverless-ses-template** configuration parameters are optional

```yaml
# add to your serverless.yml

plugins:
  - '@haftahave/serverless-ses-template'

custom:
  sesTemplatesAddStageAlias: true                          # Specifies whether to add stage and alias to template name
  sesTemplatesConfigFile: './custom-config-file/path.js'   # Config file path (default './ses-email-templates/index.js')
```
---

### Template configuration file

Template configuration file should be an array of objects:
```javascript
module.exports = [{
    name: 'example_name',
    subject: 'Your subject',
    html: '<h1>Hello world!</h1>',
    text: 'Hello world!',
}];
```

Real world example see [here](ses-email-templates/index.js):

### Usage and command line options

Run `sls ses-template deploy` in order to sync your email templates.

Optional CLI options:
```
--remove-missed -r  Set this flag in order to remove templates those are not present in your configuration file. [OPTIONAL]
--stage         -s  The stage used to populate your templates. Default: the first stage found in your project. [OPTIONAL]
--region        -r  The region used to populate your templates. Default: the first region for the first stage found. [OPTIONAL]
--alias         -a  Template alias, works only with sesTemplatesAddStageAlias option enabled. [OPTIONAL]
```
---

Run `sls ses-template delete --template template_name_goes_here` in order to delete your email template.

CLI options:

```
--template      -t  The template name you are going to delete [REQUIRED]
--stage         -s  The stage used to populate your templates. Default: the first stage found in your project. [OPTIONAL]
--region        -r  The region used to populate your templates. Default: the first region for the first stage found. [OPTIONAL]
--alias         -a  Template alias, works only with sesTemplatesAddStageAlias option enabled. [OPTIONAL]
```

## Links

- [Sending Personalized Email Using the Amazon SES API](https://docs.aws.amazon.com/ses/latest/DeveloperGuide/send-personalized-email-api.html)
- [Amazon SES API sendTemplatedEmail](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SES.html#sendTemplatedEmail-property)

## License

MIT

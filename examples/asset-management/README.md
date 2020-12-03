Description
-------------

Project creates CloudFormation stack with the following resources:

- [KMS key](../aws-resources/kms/lambda-general-key.yml)
- [S3 bucket](../aws-resources/bucket/ses-asset-bucket.yml)
- [CloudFront Distribution and Access Identity](../aws-resources/cloud-front/ses-asset-bucket-distribution.yml)
- [Route53 RecordSetGroup](../aws-resources/route53/ses-asset-domain.yml)
- [Lambda function to send emails](./functions/send-email-template/index.js)

Configuration details:

- Lambda function permissions defined by `serverless-iam-roles-per-function` plugin
- Domain certificate managed by `serverless-certificate-creator` + `serverless-plugin-scripts` plugins. \
  Certificate should be manually created by `sls create-cert --stage yourStage`.
- Assets deploy managed by [serverless-s3-deploy](https://github.com/funkybob/serverless-s3-deploy) plugin
- CloudFront invalidation managed by `serverless-plugin-scripts` plugin. \
  See `after:s3deploy:deploy` and `after:deploy:finalize` hooks.

Install
-------------

1. Buy Domain (AWS Route 53)
1. Install dependencies with yarn - `yarn`
1. Update project config section in `serverless.yml`. See `custom.projectConfig`
1. Create a domain certificate - `sls create-cert --stage yourStage`
1. Deploy the service - `sls deploy --stage yourStage`
1. Make sure your emails are verified in [SES -> Email Addresses](https://us-west-2.console.aws.amazon.com/ses/home#verified-senders-email:)

Test
-------------

Invoke `send_email_template` lambda function:

`sls invoke -f send_email_template -d '{"templateId":"example", "recipientEmail":"your@email.here"}' -l --stage yourStage`

Remove
-------------

1. `sls remove --stage yourStage`

Additional
-------------

1. Create a domain certificate - `sls create-cert --stage yourStage`
1. Remove a domain certificate - `sls remove-cert --stage yourStage`

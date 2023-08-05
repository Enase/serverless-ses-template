module.exports.getAccountId = async (serverless) =>
  serverless.providers.aws.getAccountId()

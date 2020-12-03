module.exports.getOutputs = async (serverless) => {
  const {
    service: {
      custom: {
        serviceStage,
      },
    },
    variables,
  } = serverless;

  const stackName = await variables.populateValue(serviceStage);
  const config = serverless.service.custom.exportOutputs;

  const getStackOutputs = () => serverless
    .getProvider('aws')
    .request(
      'CloudFormation',
      'describeStacks',
      { StackName: stackName },
      this.stage,
      this.region,
    )
    .then((response) => {
      const stack = response.Stacks[0];
      const outputs = stack.Outputs || [];

      return outputs.reduce(
        (allOutputs, output) => Object.assign(allOutputs, {
          [output.OutputKey]: output.OutputValue,
        }),
        {},
      );
    })
    .catch((error) => {
      const notExistMessage = `Stack with id ${stackName} does not exist`;
      if (error.providerError && error.providerError.message === notExistMessage) {
        return {};
      }
      throw error;
    });

  const collectOutputs = (outputs) => {
    if (!config) return outputs;

    const isArray = (obj) => Object.prototype.toString.call(obj) === '[object Array]';
    const isObject = (obj) => Object.prototype.toString.call(obj) === '[object Object]';

    const targetOutputKeys = isArray(config) ? config : config.include || [];
    const targetOutputs = {};

    targetOutputKeys.forEach((entry) => {
      let key = entry;
      let obj = outputs;
      if (isObject(entry)) {
        [(key)] = Object.keys(entry) || [];
        obj = entry;
      }

      targetOutputs[key] = obj[key];
    });
    return targetOutputs;
  };

  const stackOutPuts = await getStackOutputs();
  return collectOutputs(stackOutPuts);
};

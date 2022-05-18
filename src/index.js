const chalk = require('chalk');
const path = require('path');
const Table = require('cli-table');
const commandsConfig = require('./commands-config');

const defaultSesTemplatesConfigFilePath = './ses-email-templates/index.js';
const defaultSesTemplatesDeployHook = 'before:deploy:deploy';

class ServerlessSesTemplate {
  /**
   * Constructor
   * @param {Object} serverless
   * @param {Object} options
   * @param {Object} v3Utils
   * @param {Function} v3Utils.log
   * @param {Object} v3Utils.progress
   * @param {Function} v3Utils.writeText
   */
  constructor(serverless, options = {}, { log, progress, writeText } = {}) {
    this.serverless = serverless;
    this.options = options;
    this.log = log || serverless.cli.log;
    this.writeText = writeText || serverless.cli.log;
    this.progress = progress;

    if (this.serverless.service.provider.name !== 'aws') {
      throw new this.serverless.classes.Error('ses-template plugin supports only AWS');
    }

    /** @type AWS.AwsProvider */
    this.provider = this.serverless.getProvider(this.serverless.service.provider.name);

    if (this.serverless.configSchemaHandler) {
      const newCustomPropSchema = {
        type: 'object',
        properties: {
          sesTemplates: {
            type: 'object',
            properties: {
              addStage: {
                type: 'boolean',
              },
              configFile: {
                type: 'string',
              },
              deployHook: {
                type: 'string',
              },
              disableAutoDeploy: {
                type: 'boolean',
              },
              region: {
                type: 'string',
              },
            },
            additionalProperties: false,
          },
        },
      };
      serverless.configSchemaHandler.defineCustomProperties(newCustomPropSchema);
    }

    this.commands = commandsConfig;

    const {
      service: {
        custom: { sesTemplates: { deployHook = defaultSesTemplatesDeployHook } = {} },
      },
    } = this.serverless;

    this.hooks = {
      'after:info:info': this.info.bind(this),
      'ses-template:deploy:syncTemplates': this.syncTemplates.bind(this),
      'ses-template:delete:deleteGiven': this.deleteGiven.bind(this),
      'ses-template:list:list': this.list.bind(this),
      [deployHook]: this.syncTemplatesOnDeploy.bind(this),
    };
  }

  /**
   * @returns void
   */
  initOptions() {
    const {
      processedInput: { commands },
      service: {
        custom: {
          sesTemplates: {
            region: sesTemplatesRegion,
            addStage = false,
            configFile = defaultSesTemplatesConfigFilePath,
            disableAutoDeploy = false,
          } = {},
        },
        provider: { region, stage },
      },
    } = this.serverless;

    this.region = this.options.sesTemplatesRegion || sesTemplatesRegion || this.options.region || region;
    this.stage = this.options.stage || stage;

    this.removeMissed = commands.includes('deploy') ? this.options.removeMissed !== undefined : false;
    this.filter = commands.includes('list') ? (this.options.filter || '') : '';
    this.addStage = addStage;
    this.configFile = this.options.sesTemplateConfig || configFile;
    this.disableAutoDeploy = disableAutoDeploy;
  }

  /**
   * @returns {boolean}
   */
  canAddStage() {
    return Boolean(this.addStage);
  }

  /**
   * @returns {Promise<void>}
   */
  async checkConfigurationFile() {
    const fileFullPath = path.join(this.serverless.config.servicePath, this.configFile);
    if (!this.serverless.utils.fileExistsSync(fileFullPath)) {
      throw new this.serverless.classes.Error(
        `SES email templates configuration file not found by path "${fileFullPath}"`,
      );
    }

    try {
      /* eslint-disable import/no-dynamic-require */
      /* eslint-disable global-require */
      const configFunction = require(fileFullPath);
      this.configuration = await configFunction(this.serverless, this.options);
      /* eslint-enable global-require */
      /* eslint-enable import/no-dynamic-require */
    } catch (e) {
      throw new this.serverless.classes.Error(e.message);
    }
  }

  /**
   * @returns {Promise}
   */
  async syncTemplatesOnDeploy() {
    this.initOptions();
    if (this.disableAutoDeploy) {
      return Promise.resolve();
    }
    return this.syncTemplates(true);
  }

  /**
   * @param {boolean} isDeploy
   * @returns {Promise}
   */
  async syncTemplates(isDeploy = false) {
    const progressName = 'sls-ses-template-sync';
    this.createProgress(progressName, 'AWS SES template synchronization');

    this.initOptions();
    await this.checkConfigurationFile();

    const templatesToSync = this.configuration.map(
      (templateConfig) => this.addStageToTemplateName(templateConfig.name),
    );

    const templatesToRemove = this.removeMissed ? await this.getTemplatesToRemove(templatesToSync) : [];

    const updatedTemplates = [];
    const createdTemplates = [];
    const syncTemplatePromises = this.configuration.map(async (templateConfig) => {
      const templateName = this.addStageToTemplateName(templateConfig.name);
      const oldTemplate = await this.getEmailTemplate(templateName);
      if (oldTemplate !== null) {
        updatedTemplates.push(templateName);
        return this.updateTemplate(templateConfig, progressName);
      }
      createdTemplates.push(templateName);
      return this.createTemplate(templateConfig, progressName);
    });

    const deleteTemplatePromises = templatesToRemove.map((templateName) => this.deleteTemplate(
      templateName,
      progressName,
    ));

    await Promise.all([
      ...syncTemplatePromises,
      ...deleteTemplatePromises,
    ]);

    this.clearProgress(progressName);

    const summaryList = [
      ...this.createSummary('Created templates:', createdTemplates),
      ...this.createSummary('Updated templates:', updatedTemplates),
      ...this.createSummary('Deleted templates:', templatesToRemove),
    ];

    if (!summaryList.length) {
      return;
    }

    if (isDeploy) {
      summaryList.push('----------------------------------------');
      if (this.serverless.addServiceOutputSection) {
        this.serverless.addServiceOutputSection('Serverless SES Template', summaryList);
        await this.info();
      }
    } else {
      this.writeText(`\n${summaryList.join('\n')}\n`);
    }
  }

  /**
   * @param {string} title
   * @param {string[]} items
   * @returns {string[]}
   */
  createSummary(title, items) {
    const result = [];
    if (items.length) {
      result.push(title);
      result.push(...items);
    }
    return result;
  }

  /**
   * @param {string} templateName
   * @returns {string}
   */
  addStageToTemplateName(templateName) {
    return this.canAddStage() ? `${templateName}_${this.stage}` : templateName;
  }

  /**
   * @param {string} templateName
   * @returns {boolean}
   */
  isTemplateFromCurrentStage(templateName) {
    return this.canAddStage() ? String(templateName).endsWith(`_${this.stage}`) : true;
  }

  /**
   * @returns {Promise}
   */
  async deleteGiven() {
    const progressName = 'sls-ses-template-delete';
    this.createProgress(progressName, 'AWS SES template delete');

    this.initOptions();

    const result = await this.deleteTemplate(this.options.template, progressName);

    this.clearProgress(progressName);
    if (result) {
      this.logSuccess(`AWS SES template "${this.options.template}" deleted`);
    }
  }

  /**
   * @param {string} templateName
   * @param {string} progressName
   * @returns {Promise}
   */
  async deleteTemplate(templateName, progressName) {
    this.updateProgress(progressName, `Template "${templateName}" delete in progress`);

    const deleteParams = {
      TemplateName: templateName,
    };
    try {
      const result = await this.provider.request('SESV2', 'deleteEmailTemplate', deleteParams, {
        stage: this.stage,
        region: this.region,
      });
      return result;
    } catch (error) {
      this.logError(error.message);
      return false;
    }
  }

  /**
   * @param {Object} template
   * @param {string} template.name
   * @param {string} template.subject
   * @param {string} template.html
   * @param {string} template.text
   * @param {string} progressName
   * @returns {Promise}
   */
  async createTemplate({
    name,
    subject,
    html,
    text,
  }, progressName) {
    const templateName = this.addStageToTemplateName(name);
    this.updateProgress(progressName, `Creating "${templateName}" template`);

    const params = {
      TemplateContent: {
        Subject: subject,
        Html: html,
        Text: text,
      },
      TemplateName: this.addStageToTemplateName(name),
    };
    const result = await this.provider.request('SESV2', 'createEmailTemplate', params, {
      stage: this.stage,
      region: this.region,
    });

    return result;
  }

  /**
   * @param {string} templateName
   * @returns {Promise}
   */
  async getEmailTemplate(templateName) {
    try {
      const params = {
        TemplateName: templateName,
      };
      const result = await this.provider.request('SESV2', 'getEmailTemplate', params, {
        stage: this.stage,
        region: this.region,
      });

      return result;
    } catch (error) {
      if (error && error.providerErrorCodeExtension === 'NOT_FOUND_EXCEPTION') {
        return null;
      }
      throw error;
    }
  }

  /**
   * @param {Object} template
   * @param {string} template.name
   * @param {string} template.subject
   * @param {string} template.html
   * @param {string} template.text
   * @param {string} progressName
   * @returns {Promise}
   */
  async updateTemplate({
    name,
    subject,
    html,
    text,
  }, progressName) {
    const templateName = this.addStageToTemplateName(name);
    this.updateProgress(progressName, `Updating template "${templateName}"`);

    const params = {
      TemplateContent: {
        Subject: subject,
        Html: html,
        Text: text,
      },
      TemplateName: templateName,
    };
    const result = await this.provider.request('SESV2', 'updateEmailTemplate', params, {
      stage: this.stage,
      region: this.region,
    });

    return result;
  }

  /**
   * @param {Array} templatesToSync
   * @returns {Promise<*[]>}
   */
  async getTemplatesToRemove(templatesToSync) {
    const templateList = await this.loadTemplates();
    const currentTemplates = templateList.map((templateObject) => templateObject.TemplateName);
    return currentTemplates.filter(
      (templateName) => !templatesToSync.includes(templateName) && this.isTemplateFromCurrentStage(templateName),
    );
  }

  /**
   * @returns {Promise}
   */
  async info() {
    if (!this.serverless.addServiceOutputSection) {
      return;
    }
    this.initOptions();
    const {
      DedicatedIpAutoWarmupEnabled: dedicatedIpAutoWarmupEnabled,
      EnforcementStatus: enforcementStatus,
      ProductionAccessEnabled: productionAccessEnabled,
      SendingEnabled: sendingEnabled,
      Details: {
        MailType: mailType,
        WebsiteURL: websiteURL,
        ReviewDetails: {
          Status: renewStatus,
        } = {},
      } = {},
    } = await this.getAccount();
    const summaryList = [];
    renewStatus && summaryList.push(`Renew Status: ${this.colorizeText(
      renewStatus === 'GRANTED',
      renewStatus,
    )}`);
    summaryList.push(`Production Access Enabled: ${this.colorizeText(
      productionAccessEnabled,
      productionAccessEnabled,
    )}`);
    summaryList.push(`Sending Enabled: ${this.colorizeText(
      sendingEnabled,
      sendingEnabled,
    )}`);
    summaryList.push(`Dedicated Ip Auto Warmup Enabled: ${this.colorizeText(
      dedicatedIpAutoWarmupEnabled,
      dedicatedIpAutoWarmupEnabled,
    )}`);
    summaryList.push(`Enforcement Status: ${this.colorizeText(
      enforcementStatus === 'HEALTHY',
      enforcementStatus,
    )}`);
    mailType && summaryList.push(`Mail Type: ${mailType}`);
    websiteURL && summaryList.push(`Website URL: ${websiteURL}`);

    this.serverless.addServiceOutputSection('Serverless SES Status', summaryList);
  }

  /**
   * @param {boolean} condition
   * @param {string} text
   * @returns {string}
   */
  colorizeText(condition, text) {
    return condition ? chalk.green(text) : chalk.red(text);
  }

  /**
   * @returns {Promise}
   */
  async list() {
    this.initOptions();
    const progressName = 'sls-ses-template-list';
    this.createProgress(progressName, `AWS SES template list for ${this.region} region`);

    const templates = await this.loadTemplates();

    if (templates.length) {
      const maxTitleLength = templates.reduce((acc, template) => {
        const titleLength = template.TemplateName.length + 2;
        if (acc < titleLength) {
          return titleLength;
        }
        return acc;
      }, 10);

      const table = new Table({
        style: { head: ['green'] },
        head: ['Template Name', 'Created At'],
        colWidths: [maxTitleLength, 31],
      });

      templates.forEach((template) => {
        table.push([template.TemplateName, template.CreatedTimestamp.toUTCString()]);
      });

      this.writeText(`\n${table.toString()}`);
    } else {
      this.logWarning(`Templates not found in "${this.region}" region`);
    }
    this.clearProgress(progressName);
    this.logSuccess('AWS SES template list finished');
  }

  /**
   * requestOptions.pageSize - 10 max
   * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SESV2.html#listEmailTemplates-property
   * @param {Object} requestOptions
   * @param {number} [requestOptions.maxItems]
   * @param {string} [requestOptions.token]
   * @param {Object} [requestOptions.options]
   * @param {string} filter
   * @returns {Promise<Array>}
   */
  async loadTemplates({ maxItems = 10, token = undefined, ...options } = {}, filter = this.filter) {
    const { TemplatesMetadata: templates = [], NextToken: nextToken } = await this.provider.request(
      'SESV2',
      'listEmailTemplates',
      {
        ...options,
        PageSize: maxItems,
        NextToken: token,
      },
      {
        stage: this.stage,
        region: this.region,
      },
    );

    const templatesToReturn = filter
      ? templates.filter((templateObject) => String(templateObject.TemplateName).includes(filter))
      : templates;

    if (templates && templates.length) {
      if (nextToken) {
        const nextTemplates = await this.loadTemplates({ maxItems, token: nextToken, ...options });
        return [
          ...templatesToReturn,
          ...nextTemplates,
        ];
      }
      return templatesToReturn;
    }
    return [];
  }

  /**
   * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SESV2.html#getAccount-property
   * @returns {Promise<Array>}
   */
  async getAccount() {
    const account = await this.provider.request(
      'SESV2',
      'getAccount',
      { },
      {
        stage: this.stage,
        region: this.region,
      },
    );

    return account;
  }

  /**
   * @param {string} message
   * @returns void
   */
  logSuccess(message) {
    if (this.log.success) {
      this.log.success(message);
    } else {
      this.log(message);
    }
  }

  /**
   * @param {string} message
   * @returns void
   */
  logWarning(message) {
    if (this.log.warning) {
      this.log.warning(message);
    } else {
      this.log(message);
    }
  }

  /**
   * @param {string} message
   * @returns void
   */
  logError(message) {
    if (this.log.error) {
      this.log.error(message);
    } else {
      this.log(message);
    }
  }

  /**
   * @param {string} name
   * @param {string} message
   * @returns void
   */
  createProgress(name, message) {
    if (!this.progress) {
      this.log(`SesTemplate: ${message}...`);
    } else {
      this.progress.create({
        message,
        name,
      });
    }
  }

  /**
   * @param {string} name
   * @param {string} message
   * @returns void
   */
  updateProgress(name, message) {
    if (!this.progress) {
      this.log(`SesTemplate: ${message}`);
    } else {
      this.progress.get(name).update(message);
    }
  }

  /**
   * @param {string} name
   * @returns void
   */
  clearProgress(name) {
    if (this.progress) {
      this.progress.get(name).remove();
    }
  }
}

module.exports = ServerlessSesTemplate;

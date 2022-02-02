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
    return this.syncTemplates();
  }

  /**
   * @returns {Promise}
   */
  async syncTemplates() {
    const progressName = 'sls-ses-template-sync';
    this.createProgress(progressName, 'AWS SES template synchronization started');

    this.initOptions();
    await this.checkConfigurationFile();

    const templateList = await this.loadTemplates();
    const currentTemplates = templateList.map((templateObject) => templateObject.Name);

    const templatesToSync = this.configuration.map(
      (templateConfig) => this.addStageToTemplateName(templateConfig.name),
    );

    const templatesToRemove = this.removeMissed
      ? currentTemplates.filter((templateName) => !templatesToSync.includes(templateName)
                && this.isTemplateFromCurrentStage(templateName))
      : [];

    const syncTemplatePromises = this.configuration.map((templateConfig) => {
      if (currentTemplates.includes(this.addStageToTemplateName(templateConfig.name))) {
        return this.updateTemplate(templateConfig, progressName);
      }
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
    this.updateProgress(progressName, 'AWS SES template synchronization complete');
    this.clearProgress(progressName);
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
    this.createProgress(progressName, 'AWS SES template delete start');

    this.initOptions();

    await this.deleteTemplate(this.options.template, progressName);

    this.updateProgress(progressName, 'AWS SES template deleted');
    this.clearProgress(progressName);
  }

  /**
   * @param {string} templateName
   * @param {string} progressName
   * @returns {Promise}
   */
  async deleteTemplate(templateName, progressName) {
    this.updateProgress(progressName, `WARNING: Going to delete template "${templateName}"`);

    const deleteParams = {
      TemplateName: templateName,
    };
    const result = await this.provider.request('SES', 'deleteTemplate', deleteParams, {
      stage: this.stage,
      region: this.region,
    });

    this.updateProgress(progressName, `Template "${templateName}" deleted`);
    return result;
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
      Template: {
        TemplateName: this.addStageToTemplateName(name),
        SubjectPart: subject,
        HtmlPart: html,
        TextPart: text,
      },
    };
    const result = await this.provider.request('SES', 'createTemplate', params, {
      stage: this.stage,
      region: this.region,
    });

    this.updateProgress(progressName, `Template "${templateName}" created`);
    return result;
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
      Template: {
        TemplateName: templateName,
        SubjectPart: subject,
        HtmlPart: html,
        TextPart: text,
      },
    };
    const result = await this.provider.request('SES', 'updateTemplate', params, {
      stage: this.stage,
      region: this.region,
    });

    this.updateProgress(progressName, `Template "${templateName}" updated`);
    return result;
  }

  /**
   * @returns {Promise}
   */
  async list() {
    this.initOptions();

    this.log(`AWS SES template list for ${this.region} region started`);

    const templates = await this.loadTemplates();
    if (templates.length) {
      const table = new Table({});
      table.push(...templates);

      this.writeText(`\n${table.toString()}`);
    } else {
      this.log(`Templates not found in ${this.region} region`);
    }

    this.log('AWS SES template list finished');
  }

  /**
   * requestOptions.maxItems - 10 max, see https://docs.aws.amazon.com/ses/latest/APIReference/API_ListTemplates.html
   * @param {Object} requestOptions
   * @param {number} [requestOptions.maxItems]
   * @param {string} [requestOptions.token]
   * @param {Object} [requestOptions.options]
   * @param {string} filter
   * @returns {Promise<Array>}
   */
  async loadTemplates({ maxItems = 10, token = undefined, ...options } = {}, filter = this.filter) {
    const { TemplatesMetadata: templates = [], NextToken: nextToken } = await this.provider.request(
      'SES',
      'listTemplates',
      {
        ...options,
        MaxItems: maxItems,
        NextToken: token,
      },
      {
        stage: this.stage,
        region: this.region,
      },
    );

    const templatesToReturn = filter
      ? templates.filter((templateObject) => String(templateObject.Name).includes(filter))
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

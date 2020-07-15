const path = require('path');
const Table = require('cli-table');

const defaultSesTemplatesConfigFilePath = './ses-email-templates/index.js';

class ServerlessSesTemplate {
    /**
     * Constructor
     * @param {Object} serverless
     * @param {Object} options
     */
    constructor(serverless, options = {}) {
        this.serverless = serverless;
        this.options = options;

        if (this.serverless.service.provider.name !== 'aws') {
            throw new this.serverless.classes.Error('ses-template plugin supports only AWS');
        }

        /** @type AwsProvider */
        this.provider = this.serverless.getProvider(this.serverless.service.provider.name);

        this.commands = {
            'ses-template': {
                usage: 'Manage AWS SES templates',
                lifecycleEvents: [
                    'deploy',
                    'delete',
                    'list',
                ],
                commands: {
                    deploy: {
                        usage: 'Sync email templates to AWS SES',
                        lifecycleEvents: [
                            'syncTemplates',
                        ],
                        options: {
                            removeMissed: {
                                usage: 'Set this flag in order to remove missed templates. (e.g. "--removeMissed")',
                                required: false,
                            },
                        },
                    },
                    delete: {
                        usage: 'Delete email template from AWS SES by given name',
                        lifecycleEvents: [
                            'deleteGiven',
                        ],
                        options: {
                            template: {
                                usage: 'The template name you are going to delete (e.g. "--template name")',
                                required: true,
                            },
                        },
                    },
                    list: {
                        usage: 'List email templates from AWS SES',
                        lifecycleEvents: [
                            'list',
                        ],
                        options: {
                            filter: {
                                usage: 'String to filter templates by name. (e.g. "--filter")',
                                required: false,
                            },
                        },
                    },
                },
                options: {
                    stage: {
                        usage: 'Specify the stage you want to sync templates (e.g. "--stage dev")',
                        required: false,
                    },
                    alias: {
                        usage: 'Specify the alias you want to sync templates (e.g. "--alias production")',
                        required: false,
                    },
                    region: {
                        usage: 'Specify the region you want to sync templates (e.g. "--region us-west-2")',
                        required: false,
                    },
                    sesTemplateConfig: {
                        usage: 'Specify the configuration file location (e.g. "--sesTemplateConfig ./folder/file.js")',
                        required: false,
                    },
                },
            },
        };

        this.hooks = {
            'ses-template:deploy:syncTemplates': this.syncTemplates.bind(this),
            'ses-template:delete:deleteGiven': this.deleteGiven.bind(this),
            'ses-template:list:list': this.list.bind(this),
            'before:deploy:deploy': this.syncTemplatesOnDeploy.bind(this),
        };
    }

    /**
     * @returns void
     */
    initOptions() {
        const {
            processedInput: { commands },
            service: {
                custom: { sesTemplatesRegion },
                provider: { region, stage, alias },
            },
        } = this.serverless;

        this.region = this.options.sesTemplatesRegion || sesTemplatesRegion || this.options.region || region;
        this.stage = this.options.stage || stage;
        this.alias = this.options.alias || alias;

        this.removeMissed = commands.includes('deploy') ? this.options.removeMissed !== undefined : false;
        this.filter = commands.includes('list') ? (this.options.filter || '') : '';
    }

    /**
     * @returns {string}
     */
    getTemplateConfigFile() {
        return this.options.sesTemplateConfig || this.serverless.service.custom.sesTemplatesConfigFile
            || defaultSesTemplatesConfigFilePath;
    }

    /**
     * @returns {boolean}
     */
    canAddStageAlias() {
        return Boolean(this.serverless.service.custom.sesTemplatesAddStageAlias);
    }

    /**
     * @returns {Promise<void>}
     */
    async checkConfigurationFile() {
        const fileFullPath = path.join(this.serverless.config.servicePath, this.getTemplateConfigFile());
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
            if (e.message === 'configFunction is not a function') {
                const message = 'Breaking change in version 1.3.0 read here: '
                    + 'https://github.com/haftahave/serverless-ses-template/releases/tag/1.3.0';
                throw new this.serverless.classes.Error(message);
            } else {
                throw new this.serverless.classes.Error(e.message);
            }
        }
    }

    /**
     * @link https://aws.amazon.com/about-aws/global-infrastructure/regional-product-services/
     * @returns {boolean}
     */
    isRegionSupported() {
        return [
            'us-east-1', // US East (N. Virginia)
            'us-east-2', // US East (Ohio)
            'us-west-2', // US West (Oregon)
            'ca-central-1', // Canada (Montreal)
            'sa-east-1', // South America (São Paulo)
            'us-gov-west-1', // AWS GovCloud (US-West)
            'eu-central-1', // EU (Frankfurt)
            'eu-west-1', // EU (Ireland)
            'eu-west-2', // EU (London)
            'ap-southeast-1', // Asia Pacific (Singapore)
            'ap-southeast-2', // Asia Pacific (Sydney)
            'ap-northeast-1', // Asia Pacific (Tokyo)
            'ap-northeast-2', // Asia Pacific (Seoul)
            'ap-south-1', // Asia Pacific (Mumbai)
        ].includes(this.region);
    }

    /**
     * @returns {Promise}
     */
    async syncTemplatesOnDeploy() {
        if (this.serverless.service.custom.sesTemplatesDisableAutoDeploy) {
            return Promise.resolve();
        }
        return this.syncTemplates();
    }

    /**
     * @returns {Promise}
     */
    async syncTemplates() {
        this.serverless.cli.log('AWS SES template synchronization start');

        this.initOptions();
        await this.checkConfigurationFile();

        if (!this.isRegionSupported()) {
            this.serverless.cli.log(
                `WARNING: Cannot sync AWS SES templates: ${this.region} region is not supported yet.`,
            );
            return;
        }

        const templateList = await this.loadTemplates();
        const currentTemplates = templateList.map((templateObject) => templateObject.Name);

        const templatesToSync = this.configuration.map(
            (templateConfig) => this.addStageAliasToTemplateName(templateConfig.name),
        );

        const templatesToRemove = this.removeMissed
            ? currentTemplates.filter((templateName) => !templatesToSync.includes(templateName)
                && this.isTemplateFromCurrentStageAlias(templateName))
            : [];

        const syncTemplatePromises = this.configuration.map((templateConfig) => {
            if (currentTemplates.includes(this.addStageAliasToTemplateName(templateConfig.name))) {
                return this.updateTemplate(templateConfig);
            }
            return this.createTemplate(templateConfig);
        });

        const deleteTemplatePromises = templatesToRemove.map((templateName) => this.deleteTemplate(templateName));

        await Promise.all([
            ...syncTemplatePromises,
            ...deleteTemplatePromises,
        ]);
        this.serverless.cli.log('AWS SES template synchronization complete');
    }

    /**
     * @param {string} templateName
     * @returns {string}
     */
    addStageAliasToTemplateName(templateName) {
        const aliasSuffix = this.alias ? `_${this.alias}` : '';
        return this.canAddStageAlias() ? `${templateName}_${this.stage}${aliasSuffix}` : templateName;
    }

    /**
     * @param {string} templateName
     * @returns {boolean}
     */
    isTemplateFromCurrentStageAlias(templateName) {
        const aliasSuffix = this.alias ? `_${this.alias}` : '';
        return this.canAddStageAlias() ? String(templateName).endsWith(`_${this.stage}${aliasSuffix}`) : true;
    }

    /**
     * @returns {Promise}
     */
    async deleteGiven() {
        this.serverless.cli.log('AWS SES template delete start');

        this.initOptions();

        if (!this.isRegionSupported()) {
            this.serverless.cli.log(
                `WARNING: Cannot delete AWS SES template: ${this.region} region is not supported yet.`,
            );
            return;
        }
        await this.deleteTemplate(this.options.template);

        this.serverless.cli.log('AWS SES template deleted');
    }

    /**
     * @param {string} templateName
     * @returns {Promise}
     */
    deleteTemplate(templateName) {
        const deleteParams = {
            TemplateName: templateName,
        };
        this.serverless.cli.log(`WARNING: Going to delete template "${templateName}"`);
        return this.provider.request('SES', 'deleteTemplate', deleteParams, {
            stage: this.stage,
            region: this.region,
        });
    }

    /**
     * @param {string} name
     * @param {string} subject
     * @param {string} html
     * @param {string} text
     * @returns {Promise}
     */
    createTemplate({
        name,
        subject,
        html,
        text,
    }) {
        const templateName = this.addStageAliasToTemplateName(name);
        const params = {
            Template: {
                TemplateName: this.addStageAliasToTemplateName(name),
                SubjectPart: subject,
                HtmlPart: html,
                TextPart: text,
            },
        };

        this.serverless.cli.log(`Going to create template "${templateName}"`);
        return this.provider.request('SES', 'createTemplate', params, {
            stage: this.stage,
            region: this.region,
        });
    }

    /**
     * @param {string} name
     * @param {string} subject
     * @param {string} html
     * @param {string} text
     * @returns {Promise}
     */
    updateTemplate({
        name,
        subject,
        html,
        text,
    }) {
        const templateName = this.addStageAliasToTemplateName(name);
        const params = {
            Template: {
                TemplateName: templateName,
                SubjectPart: subject,
                HtmlPart: html,
                TextPart: text,
            },
        };

        this.serverless.cli.log(`Going to update template "${templateName}"`);
        return this.provider.request('SES', 'updateTemplate', params, {
            stage: this.stage,
            region: this.region,
        });
    }

    /**
     * @returns {Promise}
     */
    async list() {
        this.initOptions();

        if (!this.isRegionSupported()) {
            this.serverless.cli.log(
                `WARNING: Cannot list AWS SES templates for ${this.region} region. It's not supported yet.`,
            );
            return;
        }

        this.serverless.cli.log(`AWS SES template list for ${this.region} region started`);

        const templates = await this.loadTemplates();
        if (templates.length) {
            const table = new Table({});
            table.push(...templates);

            this.serverless.cli.log(`\n${table.toString()}`);
        } else {
            this.serverless.cli.log(`Templates not found in ${this.region} region`);
        }

        this.serverless.cli.log('AWS SES template list finished');
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
}

module.exports = ServerlessSesTemplate;

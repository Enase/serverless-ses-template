module.exports = {
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
            type: 'boolean',
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
            type: 'string',
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
            type: 'string',
          },
        },
      },
    },
    options: {
      stage: {
        usage: 'Specify the stage you want to sync templates (e.g. "--stage dev")',
        required: false,
        type: 'string',
      },
      region: {
        usage: 'Specify the region you want to sync templates (e.g. "--region us-west-2")',
        required: false,
        type: 'string',
      },
      sesTemplateConfig: {
        usage: 'Specify the configuration file location (e.g. "--sesTemplateConfig ./folder/file.js")',
        required: false,
        type: 'string',
      },
    },
  },
};

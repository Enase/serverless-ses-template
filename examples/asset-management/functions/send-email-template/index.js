import AWS from 'aws-sdk';
import EmailService from './lib/email-service';

const config = {
  aws: {
    region: 'us-west-2',
  },
  defaultEmail: process.env.APP_EMAIL_DEFAULT,
  returnPathEmail: process.env.APP_EMAIL_RETURN_PATH,
  currentStage: process.env.SERVERLESS_STAGE,
  sesUseStage: process.env.SES_USE_STAGE,
  assetDomain: process.env.ASSET_DOMAIN,
};

/**
 * SendEmailTemplateEvent
 * @typedef {{
 *   templateId: string,
 *   templateData: object,
 *   recipientEmail: string,
 *   [emailFrom]: string,
 * }} SendEmailTemplateEvent
 */

/**
 * @param {SendEmailTemplateEvent} event
 * @returns {Promise}
 */
exports.handler = async (event) => {
  const ses = new AWS.SES({
    apiVersion: '2010-12-01',
    region: config.aws.region,
  });

  const emailService = new EmailService(ses, config.defaultEmail, config.returnPathEmail);

  const {
    templateId,
    templateData,
    recipientEmail,
    emailFrom = null,
  } = event;

  try {
    await emailService.sendEmailTemplate(
      config.sesUseStage ? `${templateId}_${config.currentStage}` : templateId,
      recipientEmail,
      {
        ...templateData,
        asset_domain: config.assetDomain,
      },
      emailFrom,
    );
    return { status: 'OK' };
  } catch (error) {
    return { status: 'Error', message: error.message };
  }
};

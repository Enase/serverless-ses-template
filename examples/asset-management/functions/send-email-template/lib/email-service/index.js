import {
  EMAIL_TYPE_EXAMPLE,
} from './email-constants';

class EmailService {
  /**
   * @param {AWS.SES|SES} ses
   * @param {string} defaultEmail
   * @param {string} returnPathEmail
   */
  constructor(ses, defaultEmail, returnPathEmail) {
    this.ses = ses;
    this.defaultEmail = defaultEmail;
    this.returnPathEmail = returnPathEmail;
  }

  /**
   * @param {string} templateId
   * @returns {string}
   */
  getFromEmail(templateId) {
    const map = {
      [EMAIL_TYPE_EXAMPLE]: this.defaultEmail,
    };

    return map[templateId] || this.defaultEmail;
  }

  /**
   * @param {string} templateId
   * @param {string} emailTo
   * @param {Object} [templateData]
   * @param {string|null} [emailFrom]
   * @returns {Promise}
   */
  async sendEmailTemplate(templateId, emailTo, templateData = {}, emailFrom = null) {
    const emailAddressFrom = emailFrom || this.getFromEmail(templateId);

    /**
     * @type {SES.SendTemplatedEmailRequest}
     * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SES.html#sendTemplatedEmail-property
     */
    const sendTemplatedEmailRequest = {
      Destination: {
        // BccAddresses: [
        //     emailTo,
        // ],
        // CcAddresses: [
        //     emailTo,
        // ],
        ToAddresses: [
          emailTo,
        ],
      },
      Source: emailAddressFrom,
      Template: templateId,
      TemplateData: JSON.stringify(templateData),
      // ConfigurationSetName: 'STRING_VALUE',
      // The reply-to email address(es) for the message.
      // If the recipient replies to the message, each reply-to address will receive the reply.
      ReplyToAddresses: [
        emailAddressFrom,
      ],
      // The email address that bounces and complaints will be forwarded to when feedback forwarding is enabled.
      // If the message cannot be delivered to the recipient, then an error message will be returned
      // from the recipient's ISP; this message will then be forwarded to the email address specified by
      // the ReturnPath parameter. The ReturnPath parameter is never overwritten.
      // This email address must be either individually verified with Amazon SES, or from a domain that has been
      // verified with Amazon SES.
      ReturnPath: this.returnPathEmail,
    };

    return this.ses.sendTemplatedEmail(sendTemplatedEmailRequest).promise();
  }
}

export default EmailService;

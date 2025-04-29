import type SesTemplatePluginLogger from "./logger.js"
import type RuntimeUtils from "./runtime-utils.js"
import type {
  AnyParameters,
  ConfigurationItem,
  LoadTemplatesParams,
  Provider,
  ProviderError,
  SesGetAccountResponse,
  SesGetEmailTemplateResponse,
  SesListEmailTemplatesResponse,
  SesTemplateResponseItem,
} from "./types.js"

class RequestHandler {
  private readonly AWS_SES_SERVICE_NAME = "SESV2"
  private readonly provider: Provider
  private readonly runtimeUtils: RuntimeUtils
  private readonly logger: SesTemplatePluginLogger

  constructor(
    provider: Provider,
    runtimeUtils: RuntimeUtils,
    logger: SesTemplatePluginLogger,
  ) {
    this.provider = provider
    this.runtimeUtils = runtimeUtils
    this.logger = logger
  }

  /**
   * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SESV2.html#createEmailTemplate-property
   */
  createTemplate(
    { name, subject, html, text }: ConfigurationItem,
    progressName: string,
  ): Promise<any> {
    const templateName = this.runtimeUtils.addStageToTemplateName(name)
    this.logger.updateProgress(
      progressName,
      `Creating "${templateName}" template`,
    )

    const params = {
      TemplateContent: {
        Subject: subject,
        Html: html,
        Text: text,
      },
      TemplateName: this.runtimeUtils.addStageToTemplateName(name),
    }
    return this.makeRequest("createEmailTemplate", params)
  }

  /**
   * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SESV2.html#deleteEmailTemplate-property
   */
  async deleteTemplate(
    templateName: string,
    progressName: string,
  ): Promise<any> {
    this.logger.updateProgress(
      progressName,
      `Template "${templateName}" delete in progress`,
    )

    const deleteParams = {
      TemplateName: templateName,
    }
    try {
      return this.makeRequest("deleteEmailTemplate", deleteParams)
    } catch (error) {
      if (error instanceof Error) {
        this.logger.logError(error.message)
      }
    }
  }

  /**
   * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SESV2.html#getAccount-property
   */
  getAccount(): Promise<SesGetAccountResponse> {
    return this.makeRequest("getAccount")
  }

  /**
   * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SESV2.html#getEmailTemplate-property
   */
  async getEmailTemplate(
    templateName: string,
  ): Promise<SesGetEmailTemplateResponse | null> {
    const params = {
      TemplateName: templateName,
    }
    try {
      return (await this.makeRequest(
        "getEmailTemplate",
        params,
      )) as SesGetEmailTemplateResponse
    } catch (error) {
      if (
        error &&
        (error as ProviderError).providerErrorCodeExtension ===
          "NOT_FOUND_EXCEPTION"
      ) {
        return null
      }
      throw error
    }
  }

  /**
   * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SESV2.html#updateEmailTemplate-property
   */
  updateTemplate(
    { name, subject, html, text }: ConfigurationItem,
    progressName: string,
  ): Promise<any> {
    const templateName = this.runtimeUtils.addStageToTemplateName(name)
    this.logger.updateProgress(
      progressName,
      `Updating template "${templateName}"`,
    )

    const params = {
      TemplateContent: {
        Subject: subject,
        Html: html,
        Text: text,
      },
      TemplateName: templateName,
    }
    return this.makeRequest("updateEmailTemplate", params)
  }

  /**
   * requestOptions.pageSize - 10 max
   * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SESV2.html#listEmailTemplates-property
   */
  async loadTemplates(
    { maxItems = 10, ...options }: LoadTemplatesParams = {},
    filter = this.runtimeUtils.getFilter(),
  ): Promise<SesTemplateResponseItem[]> {
    let templates: SesTemplateResponseItem[] = []
    let nextToken: string | undefined = undefined
    do {
      const response = (await this.makeRequest("listEmailTemplates", {
        ...options,
        PageSize: maxItems,
        NextToken: nextToken,
      })) as SesListEmailTemplatesResponse
      templates = templates.concat(
        this.filterTemplates(response.TemplatesMetadata, filter),
      )
      nextToken = response.NextToken
    } while (nextToken)
    return templates
  }

  private makeRequest(
    method: string,
    params: AnyParameters = {},
  ): Promise<any> {
    return this.provider.request(this.AWS_SES_SERVICE_NAME, method, params, {
      stage: this.runtimeUtils.getStage(),
      region: this.runtimeUtils.getRegion(),
    })
  }

  private filterTemplates(
    templates: SesTemplateResponseItem[],
    filter: string,
  ): SesTemplateResponseItem[] {
    return filter
      ? templates.filter((templateObject: SesTemplateResponseItem) =>
          String(templateObject.TemplateName).includes(filter),
        )
      : templates
  }
}
export default RequestHandler

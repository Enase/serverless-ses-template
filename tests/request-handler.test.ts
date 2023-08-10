import nock from "nock"
import SesTemplatePluginLogger from "../src/logger"
import SesPluginTypes from "../src/SesTemplatePlugin"
import RequestHandler from "../src/request-handler"
import RuntimeUtils from "../src/runtime-utils"

describe("The `RequestHandler` class", () => {
  let logger: SesTemplatePluginLogger
  let progressUpdateSpy: jest.Mock
  let logErrorSpy: jest.Mock
  let runtimeUtils: RuntimeUtils
  let addStageToTemplateNameSpy: jest.Mock
  let getStageSpy: jest.Mock
  let getRegionSpy: jest.Mock
  let getFilterSpy: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    nock.disableNetConnect()
    addStageToTemplateNameSpy = jest.fn((name) => name)
    getStageSpy = jest.fn(() => "test-stage")
    getRegionSpy = jest.fn(() => "test-region")
    getFilterSpy = jest.fn(() => "")
    runtimeUtils = {
      addStageToTemplateName: addStageToTemplateNameSpy,
      getStage: getStageSpy,
      getRegion: getRegionSpy,
      getFilter: getFilterSpy,
    } as unknown as RuntimeUtils

    progressUpdateSpy = jest.fn()
    logErrorSpy = jest.fn()
    logger = {
      updateProgress: progressUpdateSpy,
      logError: logErrorSpy,
    } as unknown as SesTemplatePluginLogger
  })

  afterEach(() => {
    nock.cleanAll()
    nock.enableNetConnect()
  })

  it("should call makeRequest with correct params when progress is not set", async () => {
    const provider = {
      request: jest.fn(),
    } as unknown as SesPluginTypes.Provider
    const requestHandler = new RequestHandler(provider, runtimeUtils, logger)
    const configurationItem = {
      name: "test-template",
      subject: "test-subject",
      html: "<p>test-html</p>",
      text: "test-text",
    }
    const progressName = "test-progress"
    await requestHandler.createTemplate(configurationItem, progressName)
    expect(addStageToTemplateNameSpy).toHaveBeenCalledWith("test-template")
    expect(getStageSpy).toHaveBeenCalledTimes(1)
    expect(getRegionSpy).toHaveBeenCalledTimes(1)
    expect(getFilterSpy).toHaveBeenCalledTimes(0)
    expect(progressUpdateSpy).toHaveBeenCalledWith(
      progressName,
      'Creating "test-template" template',
    )
    expect(logErrorSpy).toHaveBeenCalledTimes(0)
    expect(provider.request).toHaveBeenCalledWith(
      "SESV2",
      "createEmailTemplate",
      {
        TemplateContent: {
          Subject: "test-subject",
          Html: "<p>test-html</p>",
          Text: "test-text",
        },
        TemplateName: "test-template",
      },
      {
        stage: "test-stage",
        region: "test-region",
      },
    )
  })
  it("should call makeRequest with correct params and return null when deletion is successful", async () => {
    const provider = {
      request: jest.fn(() => Promise.resolve(null)),
    } as unknown as SesPluginTypes.Provider

    const requestHandler = new RequestHandler(provider, runtimeUtils, logger)
    const templateName = "test-template"
    const progressName = "test-progress"
    const result = await requestHandler.deleteTemplate(
      templateName,
      progressName,
    )
    expect(addStageToTemplateNameSpy).toHaveBeenCalledTimes(0)
    expect(getStageSpy).toHaveBeenCalledTimes(1)
    expect(getRegionSpy).toHaveBeenCalledTimes(1)
    expect(getFilterSpy).toHaveBeenCalledTimes(0)
    expect(progressUpdateSpy).toHaveBeenCalledWith(
      progressName,
      `Template "${templateName}" delete in progress`,
    )
    expect(logErrorSpy).toHaveBeenCalledTimes(0)
    expect(provider.request).toHaveBeenCalledWith(
      "SESV2",
      "deleteEmailTemplate",
      { TemplateName: templateName },
      { stage: "test-stage", region: "test-region" },
    )
    expect(result).toBeNull()
  })
  it("should log an error and return false when deletion fails", async () => {
    const provider = {
      request: jest.fn(() => Promise.reject(new Error("test-error"))),
    } as unknown as SesPluginTypes.Provider

    const requestHandler = new RequestHandler(provider, runtimeUtils, logger)
    const templateName = "test-template"
    const progressName = "test-progress"
    const result = await requestHandler.deleteTemplate(
      templateName,
      progressName,
    )
    expect(addStageToTemplateNameSpy).toHaveBeenCalledTimes(0)
    expect(getStageSpy).toHaveBeenCalledTimes(1)
    expect(getRegionSpy).toHaveBeenCalledTimes(1)
    expect(getFilterSpy).toHaveBeenCalledTimes(0)
    expect(progressUpdateSpy).toHaveBeenCalledWith(
      progressName,
      `Template "${templateName}" delete in progress`,
    )
    expect(logErrorSpy).toHaveBeenCalledWith("test-error")
    expect(provider.request).toHaveBeenCalledWith(
      "SESV2",
      "deleteEmailTemplate",
      { TemplateName: templateName },
      { stage: "test-stage", region: "test-region" },
    )
    expect(result).toBeFalsy()
  })
  it("should not log an error and return false when deletion fails", async () => {
    const provider = {
      request: jest.fn(() => Promise.reject(new Object("test-error"))),
    } as unknown as SesPluginTypes.Provider

    const requestHandler = new RequestHandler(provider, runtimeUtils, logger)
    const templateName = "test-template"
    const progressName = "test-progress"
    const result = await requestHandler.deleteTemplate(
      templateName,
      progressName,
    )
    expect(addStageToTemplateNameSpy).toHaveBeenCalledTimes(0)
    expect(getStageSpy).toHaveBeenCalledTimes(1)
    expect(getRegionSpy).toHaveBeenCalledTimes(1)
    expect(getFilterSpy).toHaveBeenCalledTimes(0)
    expect(progressUpdateSpy).toHaveBeenCalledWith(
      progressName,
      `Template "${templateName}" delete in progress`,
    )
    expect(logErrorSpy).toHaveBeenCalledTimes(0)
    expect(provider.request).toHaveBeenCalledWith(
      "SESV2",
      "deleteEmailTemplate",
      { TemplateName: templateName },
      { stage: "test-stage", region: "test-region" },
    )
    expect(result).toBeFalsy()
  })
  it("should return a promise that resolves to a response object with expected properties", async () => {
    const provider = {
      request: jest.fn().mockResolvedValue({
        DedicatedIpAutoWarmupEnabled: true,
        EnforcementStatus: "test-enforcement-status",
        ProductionAccessEnabled: true,
        SendingEnabled: true,
      }),
    } as unknown as SesPluginTypes.Provider
    const requestHandler = new RequestHandler(provider, runtimeUtils, logger)
    const response = await requestHandler.getAccount()
    expect(addStageToTemplateNameSpy).toHaveBeenCalledTimes(0)
    expect(getStageSpy).toHaveBeenCalledTimes(1)
    expect(getRegionSpy).toHaveBeenCalledTimes(1)
    expect(getFilterSpy).toHaveBeenCalledTimes(0)
    expect(progressUpdateSpy).toHaveBeenCalledTimes(0)
    expect(logErrorSpy).toHaveBeenCalledTimes(0)
    expect(response).toEqual({
      DedicatedIpAutoWarmupEnabled: true,
      EnforcementStatus: "test-enforcement-status",
      ProductionAccessEnabled: true,
      SendingEnabled: true,
    })
  })
  it("should call makeRequest with correct params and return the email template when it exists", async () => {
    const provider = {
      request: jest.fn(() =>
        Promise.resolve({
          TemplateName: "test-template",
          TemplateContent: {
            Subject: "test-subject",
            Html: "<p>test-html</p>",
            Text: "test-text",
          },
        }),
      ),
    } as unknown as SesPluginTypes.Provider
    const requestHandler = new RequestHandler(provider, runtimeUtils, logger)
    const templateName = "test-template"
    const result = await requestHandler.getEmailTemplate(templateName)
    expect(addStageToTemplateNameSpy).toHaveBeenCalledTimes(0)
    expect(getStageSpy).toHaveBeenCalledTimes(1)
    expect(getRegionSpy).toHaveBeenCalledTimes(1)
    expect(getFilterSpy).toHaveBeenCalledTimes(0)
    expect(progressUpdateSpy).toHaveBeenCalledTimes(0)
    expect(logErrorSpy).toHaveBeenCalledTimes(0)
    expect(provider.request).toHaveBeenCalledWith(
      "SESV2",
      "getEmailTemplate",
      { TemplateName: templateName },
      { stage: "test-stage", region: "test-region" },
    )
    expect(result).toEqual({
      TemplateName: "test-template",
      TemplateContent: {
        Subject: "test-subject",
        Html: "<p>test-html</p>",
        Text: "test-text",
      },
    })
  })
  it("should call makeRequest with correct params and return null when the email template does not exist", async () => {
    const provider = {
      request: jest.fn(() =>
        Promise.reject({
          providerErrorCodeExtension: "NOT_FOUND_EXCEPTION",
        }),
      ),
    } as unknown as SesPluginTypes.Provider
    const requestHandler = new RequestHandler(provider, runtimeUtils, logger)
    const templateName = "test-template"
    const result = await requestHandler.getEmailTemplate(templateName)
    expect(addStageToTemplateNameSpy).toHaveBeenCalledTimes(0)
    expect(getStageSpy).toHaveBeenCalledTimes(1)
    expect(getRegionSpy).toHaveBeenCalledTimes(1)
    expect(getFilterSpy).toHaveBeenCalledTimes(0)
    expect(progressUpdateSpy).toHaveBeenCalledTimes(0)
    expect(logErrorSpy).toHaveBeenCalledTimes(0)
    expect(provider.request).toHaveBeenCalledWith(
      "SESV2",
      "getEmailTemplate",
      { TemplateName: templateName },
      { stage: "test-stage", region: "test-region" },
    )
    expect(result).toBeNull()
  })
  it("should throw an error when request fails", async () => {
    const provider = {
      request: jest.fn(() => Promise.reject(new Error("test-error"))),
    } as unknown as SesPluginTypes.Provider

    const requestHandler = new RequestHandler(provider, runtimeUtils, logger)
    const templateName = "test-template"
    await expect(requestHandler.getEmailTemplate(templateName)).rejects.toThrow(
      "test-error",
    )
  })
  it("should call makeRequest with correct params and return a response object when update is successful", async () => {
    const provider = {
      request: jest.fn().mockResolvedValue({
        Message: "test-message",
      }),
    } as unknown as SesPluginTypes.Provider
    const requestHandler = new RequestHandler(provider, runtimeUtils, logger)
    const configurationItem = {
      name: "test-template",
      subject: "test-subject",
      html: "<p>test-html</p>",
      text: "test-text",
    }
    const progressName = "test-progress"
    const result = await requestHandler.updateTemplate(
      configurationItem,
      progressName,
    )
    expect(addStageToTemplateNameSpy).toHaveBeenCalledWith("test-template")
    expect(getStageSpy).toHaveBeenCalledTimes(1)
    expect(getRegionSpy).toHaveBeenCalledTimes(1)
    expect(getFilterSpy).toHaveBeenCalledTimes(0)
    expect(progressUpdateSpy).toHaveBeenCalledWith(
      progressName,
      'Updating template "test-template"',
    )
    expect(logErrorSpy).toHaveBeenCalledTimes(0)
    expect(provider.request).toHaveBeenCalledWith(
      "SESV2",
      "updateEmailTemplate",
      {
        TemplateContent: {
          Subject: "test-subject",
          Html: "<p>test-html</p>",
          Text: "test-text",
        },
        TemplateName: "test-template",
      },
      { region: "test-region", stage: "test-stage" },
    )
    expect(result).toEqual({ Message: "test-message" })
  })
  it("should return an empty array when there are no templates", async () => {
    const provider = {
      request: jest.fn().mockResolvedValue({ TemplatesMetadata: [] }),
    } as unknown as SesPluginTypes.Provider
    const requestHandler = new RequestHandler(provider, runtimeUtils, logger)
    const result = await requestHandler.loadTemplates()
    expect(result).toEqual([])
  })
  it("should return an array of templates when there are templates", async () => {
    const templates = [
      { TemplateName: "template1", CreatedTimestamp: "" },
      { TemplateName: "template2", CreatedTimestamp: "" },
    ]
    const provider = {
      request: jest.fn().mockResolvedValue({
        TemplatesMetadata: templates,
      }),
    } as unknown as SesPluginTypes.Provider
    const requestHandler = new RequestHandler(provider, runtimeUtils, logger)
    const result = await requestHandler.loadTemplates({}, "template1")
    expect(result).toEqual([
      { TemplateName: "template1", CreatedTimestamp: "" },
    ])
  })
})

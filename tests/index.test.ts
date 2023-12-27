import fs from "node:fs"
import path from "node:path"
import nock from "nock"
import chalk from "chalk"
import ServerlessSesTemplatePlugin from "../src/index"
import RuntimeUtils from "../src/runtime-utils"
import RequestHandler from "../src/request-handler"
import SesTemplatePluginLogger from "../src/logger"
import type {
  PluginOptions,
  ServerlessExtended,
  ServerlessLogging,
} from "../src/types"

jest.mock("chalk", () => ({
  green: jest.fn(),
  red: jest.fn(),
}))

jest.mock("../src/runtime-utils")
const mockedRuntimeUtils = RuntimeUtils as jest.MockedClass<typeof RuntimeUtils>

jest.mock("../src/request-handler")
const mockedRequestHandler = RequestHandler as jest.MockedClass<
  typeof RequestHandler
>
jest.mock("../src/logger")
const mockedSesTemplatePluginLogger =
  SesTemplatePluginLogger as jest.MockedClass<typeof SesTemplatePluginLogger>

class NoErrorThrownError extends Error {}
const getError = async <TError>(call: () => unknown): Promise<TError> => {
  try {
    await call()

    throw new NoErrorThrownError()
  } catch (error: unknown) {
    return error as TError
  }
}

describe("The `ServerlessSesTemplatePlugin` plugin", () => {
  const options = {
    stage: null,
    region: null,
  } as unknown as PluginOptions
  let logger: ServerlessLogging
  let progressUpdateSpy: jest.Mock
  let progressRemoveSpy: jest.Mock
  let getConfigFileMock: jest.SpyInstance
  let isAutoDeployDisabledMock: jest.SpyInstance
  let serverless: ServerlessExtended

  beforeEach(() => {
    nock.disableNetConnect()
    getConfigFileMock = jest
      .spyOn(mockedRuntimeUtils.prototype, "getConfigFile")
      .mockImplementation(() => "./ses-email-templates/index.js")
    isAutoDeployDisabledMock = jest
      .spyOn(mockedRuntimeUtils.prototype, "isAutoDeployDisabled")
      .mockImplementation(() => false)

    progressUpdateSpy = jest.fn()
    progressRemoveSpy = jest.fn()
    const progress = {
      get: jest.fn((_name: string) => ({
        update: progressUpdateSpy,
        remove: progressRemoveSpy,
      })),
      create: jest.fn(),
    } as unknown as ServerlessLogging["progress"]

    const logSpy = {
      success: jest.fn(),
      warning: jest.fn(),
      error: jest.fn(),
    } as unknown as ServerlessLogging["log"]

    logger = {
      log: logSpy,
      progress,
      writeText: jest.fn(),
    } as ServerlessLogging
    serverless = {
      service: {
        provider: {
          name: "aws",
          region: "us-west-2",
          stage: "dev",
        },
        custom: {},
      } as unknown as ServerlessExtended["service"],
      processedInput: { commands: ["ses-template"] },
      config: {
        servicePath: path.join(
          __dirname,
          "../examples/cloud-front-service/asset-management",
        ),
      } as ServerlessExtended["config"],
      getProvider: (_name: string) => undefined,
      utils: {
        fileExistsSync: jest.fn((_filePath: string) => {
          return true
        }),
        readFileSync: (filePath: string) =>
          fs.readFileSync(filePath).toString().trim(),
      } as unknown as ServerlessExtended["utils"],
      classes: {
        Error: jest.fn((message: string) => Error(message)),
      } as unknown as ServerlessExtended["classes"],
      cli: {
        log: jest.fn(),
      } as ServerlessExtended["cli"],
      configSchemaHandler: {
        defineCustomProperties: jest.fn((_schema: any) => true),
      } as unknown as ServerlessExtended["configSchemaHandler"],
      addServiceOutputSection: jest.fn(),
    } as unknown as ServerlessExtended
  })

  afterEach(() => {
    mockedRuntimeUtils.mockClear()
    mockedRequestHandler.mockClear()
    mockedSesTemplatePluginLogger.mockClear()
    jest.restoreAllMocks()
    jest.resetAllMocks()
    jest.resetModules()
    nock.cleanAll()
    nock.enableNetConnect()
  })

  it("should load the configuration file and return its content once", async () => {
    const plugin = new ServerlessSesTemplatePlugin(serverless, options, logger)
    const expectedConfig = [
      {
        name: "test-template",
        subject: "test-subject",
        html: "test-html",
        text: "test-text",
      },
    ]
    jest.mock(
      "../examples/cloud-front-service/asset-management/ses-email-templates",
      () => async () => expectedConfig,
    )
    await plugin.loadConfigurationFile()
    const result = await plugin.loadConfigurationFile()
    expect(serverless.utils.fileExistsSync).toHaveBeenCalledTimes(1)
    expect(getConfigFileMock).toHaveBeenCalledTimes(1)
    expect(result).toEqual(expectedConfig)
  })
  it("should throw an error when the configuration file does not have default export", async () => {
    const plugin = new ServerlessSesTemplatePlugin(serverless, options, logger)
    jest.mock(
      "../examples/cloud-front-service/asset-management/ses-email-templates",
      () => undefined,
    )
    const error: Error = await getError(
      async () => await plugin.loadConfigurationFile(),
    )
    expect(serverless.utils.fileExistsSync).toHaveBeenCalledTimes(1)
    expect(getConfigFileMock).toHaveBeenCalledTimes(1)
    expect(serverless.classes.Error).toHaveBeenCalledTimes(1)
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe(
      'Configuration file should export "default" function',
    )
  })
  it("should throw an error when the configuration file is not found", async () => {
    const plugin = new ServerlessSesTemplatePlugin(
      serverless,
      options,
      {} as ServerlessLogging,
    )
    serverless.utils.fileExistsSync = jest.fn((_filePath: string) => {
      return false
    })
    const error: Error = await getError(
      async () => await plugin.loadConfigurationFile(),
    )
    expect(serverless.utils.fileExistsSync).toHaveBeenCalledTimes(1)
    expect(getConfigFileMock).toHaveBeenCalledTimes(1)
    expect(serverless.classes.Error).toHaveBeenCalledTimes(1)
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toMatch(
      new RegExp(
        '^SES email templates configuration file not found by path ".+"$',
      ),
    )
  })
  it("should throw an error when the configuration file cannot be loaded", async () => {
    jest.mock(
      "../examples/cloud-front-service/asset-management/ses-email-templates",
      () => async () => {
        throw new Error("cannot load")
      },
    )
    const plugin = new ServerlessSesTemplatePlugin(
      serverless,
      options,
      {} as ServerlessLogging,
    )
    const error: Error = await getError(
      async () => await plugin.loadConfigurationFile(),
    )
    expect(serverless.utils.fileExistsSync).toHaveBeenCalledTimes(1)
    expect(getConfigFileMock).toHaveBeenCalledTimes(1)
    expect(serverless.classes.Error).toHaveBeenCalledTimes(1)
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe("cannot load")
  })
  it("should handle unexpected error type when the configuration file cannot be loaded", async () => {
    jest.mock(
      "../examples/cloud-front-service/asset-management/ses-email-templates",
      () => async () => {
        throw new Object("cannot load")
      },
    )
    const plugin = new ServerlessSesTemplatePlugin(
      serverless,
      options,
      {} as ServerlessLogging,
    )
    const error: Error = await getError(
      async () => await plugin.loadConfigurationFile(),
    )
    expect(serverless.utils.fileExistsSync).toHaveBeenCalledTimes(1)
    expect(getConfigFileMock).toHaveBeenCalledTimes(1)
    expect(serverless.classes.Error).toHaveBeenCalledTimes(1)
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe("cannot load")
  })
  it("should call syncTemplates method with true argument and return its result when auto deploy is not disabled", async () => {
    const plugin = new ServerlessSesTemplatePlugin(serverless, options, logger)
    plugin.syncTemplates = jest.fn().mockResolvedValueOnce(undefined)
    const result = await plugin.syncTemplatesOnDeploy()
    expect(isAutoDeployDisabledMock).toHaveBeenCalledTimes(1)
    expect(plugin.syncTemplates).toHaveBeenCalledWith(true)
    expect(result).toBeUndefined()
  })
  it("should not call syncTemplates method and return void when auto deploy is disabled", async () => {
    isAutoDeployDisabledMock = jest
      .spyOn(mockedRuntimeUtils.prototype, "isAutoDeployDisabled")
      .mockImplementation(() => true)
    const plugin = new ServerlessSesTemplatePlugin(serverless, options, logger)
    plugin.syncTemplates = jest.fn().mockResolvedValueOnce(undefined)
    const result = await plugin.syncTemplatesOnDeploy()
    expect(isAutoDeployDisabledMock).toHaveBeenCalledTimes(1)
    expect(plugin.syncTemplates).not.toHaveBeenCalled()
    expect(result).toBeUndefined()
  })
  it("should update existing templates when they have changed", async () => {
    mockedSesTemplatePluginLogger.mockImplementation(() => {
      const loggerClass = jest.requireActual("../src/logger").default
      return new loggerClass(logger.log, logger.writeText, logger.progress)
    })
    const addStageToTemplateNameMock = jest
      .spyOn(mockedRuntimeUtils.prototype, "addStageToTemplateName")
      .mockImplementation(() => "test-template-dev")
    const shouldRemoveMissedMock = jest
      .spyOn(mockedRuntimeUtils.prototype, "shouldRemoveMissed")
      .mockImplementation(() => true)

    const getEmailTemplateMock = jest
      .spyOn(mockedRequestHandler.prototype, "getEmailTemplate")
      .mockImplementation(async (_t: string) => ({
        TemplateName: "test-template-dev",
        TemplateContent: {
          Subject: "old-subject",
          Html: "old-html",
          Text: "old-text",
        },
      }))

    const updateTemplateMock = jest
      .spyOn(mockedRequestHandler.prototype, "updateTemplate")
      .mockImplementation(() => Promise.resolve(null))

    const plugin = new ServerlessSesTemplatePlugin(serverless, options, logger)
    plugin.loadConfigurationFile = jest.fn().mockResolvedValueOnce([
      {
        name: "test-template",
        subject: "test-subject",
        html: "test-html",
        text: "test-text",
      },
    ])

    plugin.getTemplatesToRemove = jest.fn().mockResolvedValueOnce([])
    plugin.createSummary = jest
      .fn()
      .mockReturnValue(["Updated templates: test-template-dev"])
    plugin.info = jest.fn().mockResolvedValueOnce(undefined)

    await plugin.syncTemplates(true)

    expect(logger.progress.create).toHaveBeenCalledWith({
      message: "AWS SES template synchronization",
      name: "sls-ses-template-sync",
    })
    expect(plugin.loadConfigurationFile).toHaveBeenCalledTimes(1)

    expect(addStageToTemplateNameMock).toHaveBeenCalled()
    expect(shouldRemoveMissedMock).toHaveBeenCalledTimes(1)
    expect(getEmailTemplateMock).toHaveBeenCalledTimes(1)
    expect(updateTemplateMock).toHaveBeenCalledTimes(1)

    expect(plugin.getTemplatesToRemove).toHaveBeenCalled()
    expect(plugin.createSummary).toHaveBeenCalled()
    expect(serverless.addServiceOutputSection).toHaveBeenCalledWith(
      "Serverless SES Template",
      [
        "Updated templates: test-template-dev",
        "Updated templates: test-template-dev",
        "Updated templates: test-template-dev",
        "----------------------------------------",
      ],
    )
    expect(plugin.info).toHaveBeenCalled()
  })
  it("should create new templates when they don't exist while deploy", async () => {
    mockedSesTemplatePluginLogger.mockImplementation(() => {
      const loggerClass = jest.requireActual("../src/logger").default
      return new loggerClass(logger.log, logger.writeText, logger.progress)
    })

    const shouldRemoveMissedMock = jest
      .spyOn(mockedRuntimeUtils.prototype, "shouldRemoveMissed")
      .mockImplementation(() => true)

    const getEmailTemplateMock = jest
      .spyOn(mockedRequestHandler.prototype, "getEmailTemplate")
      .mockResolvedValueOnce(null)
    const createTemplateMock = jest
      .spyOn(mockedRequestHandler.prototype, "createTemplate")
      .mockResolvedValueOnce(null)
    const addStageToTemplateNameMock = jest
      .spyOn(mockedRuntimeUtils.prototype, "addStageToTemplateName")
      .mockImplementation((name: string): string => `${name}-dev`)

    const plugin = new ServerlessSesTemplatePlugin(serverless, options, logger)
    const configuration = [
      {
        name: "test-template",
        subject: "test-subject",
        html: "test-html",
        text: "test-text",
      },
    ]
    const expectedOutputSection = [
      "Created templates: test-template-dev",
      "----------------------------------------",
    ]

    plugin.loadConfigurationFile = jest
      .fn()
      .mockResolvedValueOnce(configuration)
    plugin.getTemplatesToRemove = jest.fn().mockResolvedValueOnce([])
    plugin.createSummary = jest
      .fn()
      .mockReturnValueOnce(["Created templates: test-template-dev"])
      .mockReturnValueOnce([])
      .mockReturnValueOnce([])
    plugin.info = jest.fn().mockResolvedValueOnce(undefined)

    await plugin.syncTemplates(true)

    expect(logger.progress.create).toHaveBeenCalledWith({
      message: "AWS SES template synchronization",
      name: "sls-ses-template-sync",
    })
    expect(plugin.loadConfigurationFile).toHaveBeenCalledTimes(1)
    expect(shouldRemoveMissedMock).toHaveBeenCalledTimes(1)
    expect(plugin.getTemplatesToRemove).toHaveBeenCalledTimes(1)
    expect(plugin.createSummary).toHaveBeenCalledTimes(3)
    expect(plugin.info).toHaveBeenCalledTimes(1)
    expect(getEmailTemplateMock).toHaveBeenCalledTimes(1)
    expect(createTemplateMock).toHaveBeenCalledTimes(1)
    expect(addStageToTemplateNameMock).toHaveBeenCalledWith("test-template")
    expect(logger.progress.get).toHaveBeenCalledWith("sls-ses-template-sync")
    expect(progressRemoveSpy).toHaveBeenCalledTimes(1)
    expect(logger.writeText).not.toHaveBeenCalled()
    expect(serverless.addServiceOutputSection).toHaveBeenCalledWith(
      "Serverless SES Template",
      expectedOutputSection,
    )
  })
  it("sync templates should delete templates", async () => {
    mockedSesTemplatePluginLogger.mockImplementation(() => {
      const loggerClass = jest.requireActual("../src/logger").default
      return new loggerClass(logger.log, logger.writeText, logger.progress)
    })

    const shouldRemoveMissedMock = jest
      .spyOn(mockedRuntimeUtils.prototype, "shouldRemoveMissed")
      .mockImplementation(() => true)

    const getEmailTemplateMock = jest
      .spyOn(mockedRequestHandler.prototype, "getEmailTemplate")
      .mockResolvedValueOnce(null)
    const createTemplateMock = jest
      .spyOn(mockedRequestHandler.prototype, "createTemplate")
      .mockResolvedValueOnce(null)
    const addStageToTemplateNameMock = jest
      .spyOn(mockedRuntimeUtils.prototype, "addStageToTemplateName")
      .mockImplementation((name: string): string => `${name}-dev`)

    const plugin = new ServerlessSesTemplatePlugin(serverless, options, logger)
    const configuration = [
      {
        name: "test-template",
        subject: "test-subject",
        html: "test-html",
        text: "test-text",
      },
    ]
    plugin.loadConfigurationFile = jest
      .fn()
      .mockResolvedValueOnce(configuration)
    plugin.getTemplatesToRemove = jest
      .fn()
      .mockResolvedValueOnce(["del-template-dev"])
    plugin.createSummary = jest
      .fn()
      .mockReturnValueOnce(["Created templates: test-template-dev"])
      .mockReturnValueOnce([])
      .mockReturnValueOnce(["Deleted templates: del-template-dev"])
    plugin.info = jest.fn().mockResolvedValueOnce(undefined)

    await plugin.syncTemplates()

    expect(logger.progress.create).toHaveBeenCalledWith({
      message: "AWS SES template synchronization",
      name: "sls-ses-template-sync",
    })
    expect(plugin.loadConfigurationFile).toHaveBeenCalledTimes(1)
    expect(shouldRemoveMissedMock).toHaveBeenCalledTimes(1)
    expect(plugin.getTemplatesToRemove).toHaveBeenCalledTimes(1)
    expect(plugin.info).not.toHaveBeenCalled()
    expect(getEmailTemplateMock).toHaveBeenCalledTimes(1)
    expect(createTemplateMock).toHaveBeenCalledTimes(1)
    expect(addStageToTemplateNameMock).toHaveBeenCalledWith("test-template")
    expect(logger.progress.get).toHaveBeenCalledWith("sls-ses-template-sync")
    expect(progressRemoveSpy).toHaveBeenCalledTimes(1)
    expect(plugin.createSummary).toHaveBeenCalledTimes(3)
    expect(logger.writeText).toHaveBeenCalledWith(
      `\n${[
        "Created templates: test-template-dev",
        "Deleted templates: del-template-dev",
      ].join("\n")}\n`,
    )
    expect(serverless.addServiceOutputSection).not.toHaveBeenCalled()
  })
  it("sync templates should return void if no action done", async () => {
    mockedSesTemplatePluginLogger.mockImplementation(() => {
      const loggerClass = jest.requireActual("../src/logger").default
      return new loggerClass(logger.log, logger.writeText, logger.progress)
    })

    const shouldRemoveMissedMock = jest
      .spyOn(mockedRuntimeUtils.prototype, "shouldRemoveMissed")
      .mockImplementation(() => false)

    const getEmailTemplateMock = jest
      .spyOn(mockedRequestHandler.prototype, "getEmailTemplate")
      .mockResolvedValueOnce(null)
    const createTemplateMock = jest
      .spyOn(mockedRequestHandler.prototype, "createTemplate")
      .mockResolvedValueOnce(null)
    const addStageToTemplateNameMock = jest
      .spyOn(mockedRuntimeUtils.prototype, "addStageToTemplateName")
      .mockImplementation((name: string): string => `${name}-dev`)

    const plugin = new ServerlessSesTemplatePlugin(serverless, options, logger)
    plugin.loadConfigurationFile = jest.fn().mockResolvedValueOnce([])
    plugin.getTemplatesToRemove = jest.fn()
    plugin.createSummary = jest
      .fn()
      .mockReturnValueOnce([])
      .mockReturnValueOnce([])
      .mockReturnValueOnce([])
    plugin.info = jest.fn().mockResolvedValueOnce(undefined)

    await plugin.syncTemplates(true)

    expect(logger.progress.create).toHaveBeenCalledWith({
      message: "AWS SES template synchronization",
      name: "sls-ses-template-sync",
    })
    expect(plugin.loadConfigurationFile).toHaveBeenCalledTimes(1)
    expect(shouldRemoveMissedMock).toHaveBeenCalledTimes(1)
    expect(plugin.getTemplatesToRemove).not.toHaveBeenCalled()
    expect(plugin.info).not.toHaveBeenCalled()
    expect(getEmailTemplateMock).not.toHaveBeenCalled()
    expect(createTemplateMock).not.toHaveBeenCalled()
    expect(addStageToTemplateNameMock).not.toHaveBeenCalled()
    expect(logger.progress.get).toHaveBeenCalledWith("sls-ses-template-sync")
    expect(progressRemoveSpy).toHaveBeenCalledTimes(1)
    expect(plugin.createSummary).toHaveBeenCalledTimes(3)
    expect(logger.writeText).not.toHaveBeenCalled()
    expect(serverless.addServiceOutputSection).not.toHaveBeenCalled()
  })
  it("should successfully delete an AWS SES template when 'template' parameter is provided", async () => {
    const progressName = "sls-ses-template-delete"
    const templateName = "test-template"
    const expectedMessage = `AWS SES template "${templateName}" deleted`
    const pluginOptions = {
      template: templateName,
      ...options,
    }

    const deleteTemplateSpy = jest
      .spyOn(mockedRequestHandler.prototype, "deleteTemplate")
      .mockResolvedValueOnce(true)
    const createProgressSpy = jest.spyOn(
      mockedSesTemplatePluginLogger.prototype,
      "createProgress",
    )
    const clearProgressSpy = jest.spyOn(
      mockedSesTemplatePluginLogger.prototype,
      "clearProgress",
    )
    const logSuccessSpy = jest.spyOn(
      mockedSesTemplatePluginLogger.prototype,
      "logSuccess",
    )

    const plugin = new ServerlessSesTemplatePlugin(
      serverless,
      pluginOptions,
      logger,
    )
    await plugin.deleteGiven()

    expect(createProgressSpy).toHaveBeenCalledWith(
      progressName,
      "AWS SES template delete",
    )
    expect(deleteTemplateSpy).toHaveBeenCalledWith(templateName, progressName)
    expect(clearProgressSpy).toHaveBeenCalledWith(progressName)
    expect(logSuccessSpy).toHaveBeenCalledWith(expectedMessage)
  })
  it("should skipp success message on delete an AWS SES template when no result received", async () => {
    const progressName = "sls-ses-template-delete"
    const templateName = "test-template"
    const deleteTemplateSpy = jest
      .spyOn(mockedRequestHandler.prototype, "deleteTemplate")
      .mockResolvedValueOnce(false)
    const createProgressSpy = jest.spyOn(
      mockedSesTemplatePluginLogger.prototype,
      "createProgress",
    )
    const clearProgressSpy = jest.spyOn(
      mockedSesTemplatePluginLogger.prototype,
      "clearProgress",
    )
    const logSuccessSpy = jest.spyOn(
      mockedSesTemplatePluginLogger.prototype,
      "logSuccess",
    )
    const pluginOptions = {
      template: templateName,
      ...options,
    }
    const plugin = new ServerlessSesTemplatePlugin(
      serverless,
      pluginOptions,
      logger,
    )

    await plugin.deleteGiven()

    expect(createProgressSpy).toHaveBeenCalledWith(
      progressName,
      "AWS SES template delete",
    )
    expect(deleteTemplateSpy).toHaveBeenCalledWith(templateName, progressName)
    expect(clearProgressSpy).toHaveBeenCalledWith(progressName)
    expect(logSuccessSpy).not.toHaveBeenCalled()
  })
  it("should return void when template parameter is not provided", async () => {
    const deleteTemplateSpy = jest.spyOn(
      mockedRequestHandler.prototype,
      "deleteTemplate",
    )
    const logErrorSpy = jest.spyOn(
      mockedSesTemplatePluginLogger.prototype,
      "logError",
    )

    const plugin = new ServerlessSesTemplatePlugin(serverless, options, logger)
    await plugin.deleteGiven()

    expect(deleteTemplateSpy).not.toHaveBeenCalled()
    expect(logErrorSpy).toHaveBeenCalledWith("template parameter is required")
  })
  it("should return an empty array when the items array is empty", () => {
    const plugin = new ServerlessSesTemplatePlugin(serverless, options, logger)
    const title = "Test Title"
    const items: ReadonlyArray<string> = []
    const result = plugin.createSummary(title, items)
    expect(result).toEqual([])
  })
  it("should return an array with title and items when the items array is not empty", () => {
    const plugin = new ServerlessSesTemplatePlugin(serverless, options, logger)
    const title = "Test Title"
    const items: ReadonlyArray<string> = ["Item 1", "Item 2"]
    const result = plugin.createSummary(title, items)
    expect(result).toEqual(["Test Title", "Item 1", "Item 2"])
  })
  it("should return an empty array when there are no templates to remove", async () => {
    const loadTemplatesMock = jest
      .spyOn(mockedRequestHandler.prototype, "loadTemplates")
      .mockResolvedValueOnce([])
    const plugin = new ServerlessSesTemplatePlugin(serverless, options, logger)
    const templatesToSync: ReadonlyArray<string> = []
    const result = await plugin.getTemplatesToRemove(templatesToSync)
    expect(loadTemplatesMock).toHaveBeenCalledTimes(1)
    expect(result).toEqual([])
  })
  it("should return the correct templates to remove based on the templates to sync and the current templates", async () => {
    const currentTemplates = [
      { TemplateName: "template1", CreatedTimestamp: new Date() },
      { TemplateName: "template2", CreatedTimestamp: new Date() },
      { TemplateName: "template3", CreatedTimestamp: new Date() },
    ]
    const loadTemplatesMock = jest
      .spyOn(mockedRequestHandler.prototype, "loadTemplates")
      .mockResolvedValueOnce(currentTemplates)
    const isTemplateFromCurrentStageMock = jest
      .spyOn(mockedRuntimeUtils.prototype, "isTemplateFromCurrentStage")
      .mockImplementation((_name: string): boolean => true)

    const plugin = new ServerlessSesTemplatePlugin(serverless, options, logger)
    const templatesToSync: ReadonlyArray<string> = ["template1", "template2"]
    const result = await plugin.getTemplatesToRemove(templatesToSync)
    expect(loadTemplatesMock).toHaveBeenCalledTimes(1)
    expect(isTemplateFromCurrentStageMock).toHaveBeenCalledTimes(1)
    expect(result).toEqual(["template3"])
  })
  it("should successfully retrieve account information and add an output section", async () => {
    const accountInfo = {
      DedicatedIpAutoWarmupEnabled: true,
      EnforcementStatus: "HEALTHY",
      ProductionAccessEnabled: true,
      SendingEnabled: true,
      Details: {
        MailType: "test-mail-type",
        WebsiteURL: "test-website-url",
        ReviewDetails: { Status: "GRANTED" },
      },
    }

    const addServiceOutputSectionMock = jest.spyOn(
      serverless,
      "addServiceOutputSection",
    )

    const getAccountMock = jest
      .spyOn(mockedRequestHandler.prototype, "getAccount")
      .mockResolvedValueOnce(accountInfo)

    const plugin = new ServerlessSesTemplatePlugin(serverless, options, logger)
    plugin.colorizeText = jest
      .fn()
      .mockImplementation((_condition: boolean, text: string) => text)
    await plugin.info()

    expect(getAccountMock).toHaveBeenCalledTimes(1)
    expect(plugin.colorizeText).toHaveBeenCalledTimes(5)
    expect(plugin.colorizeText).toHaveBeenCalledWith(true, "GRANTED")
    expect(plugin.colorizeText).toHaveBeenCalledWith(true, "true")
    expect(plugin.colorizeText).toHaveBeenCalledWith(true, "true")
    expect(plugin.colorizeText).toHaveBeenCalledWith(true, "true")
    expect(plugin.colorizeText).toHaveBeenCalledWith(true, "true")
    expect(addServiceOutputSectionMock).toHaveBeenCalledWith(
      "Serverless SES Status",
      [
        "Renew Status: GRANTED",
        "Production Access Enabled: true",
        "Sending Enabled: true",
        "Dedicated Ip Auto Warmup Enabled: true",
        "Enforcement Status: HEALTHY",
        "Mail Type: test-mail-type",
        "Website URL: test-website-url",
      ],
    )
  })
  it("should successfully retrieve account information with default values set", async () => {
    const accountInfo = {
      DedicatedIpAutoWarmupEnabled: true,
      EnforcementStatus: "HEALTHY",
      ProductionAccessEnabled: true,
      SendingEnabled: true,
    }

    const addServiceOutputSectionMock = jest.spyOn(
      serverless,
      "addServiceOutputSection",
    )

    const getAccountMock = jest
      .spyOn(mockedRequestHandler.prototype, "getAccount")
      .mockResolvedValueOnce(accountInfo)

    const plugin = new ServerlessSesTemplatePlugin(serverless, options, logger)
    plugin.colorizeText = jest
      .fn()
      .mockImplementation((_condition: boolean, text: string) => text)
    await plugin.info()

    expect(getAccountMock).toHaveBeenCalledTimes(1)
    expect(plugin.colorizeText).toHaveBeenCalledTimes(4)
    expect(plugin.colorizeText).toHaveBeenCalledWith(true, "true")
    expect(plugin.colorizeText).toHaveBeenCalledWith(true, "true")
    expect(plugin.colorizeText).toHaveBeenCalledWith(true, "true")
    expect(plugin.colorizeText).toHaveBeenCalledWith(true, "true")
    expect(addServiceOutputSectionMock).toHaveBeenCalledWith(
      "Serverless SES Status",
      [
        "Production Access Enabled: true",
        "Sending Enabled: true",
        "Dedicated Ip Auto Warmup Enabled: true",
        "Enforcement Status: HEALTHY",
      ],
    )
  })
  it("should return a string with green color when the condition is true and the text is not empty", () => {
    const greenMock = chalk.green as unknown as jest.Mock
    greenMock.mockReturnValueOnce("test-green")

    const redMock = chalk.red as unknown as jest.Mock
    redMock.mockReturnValueOnce("test-red")

    const plugin = new ServerlessSesTemplatePlugin(serverless, options, logger)
    const result = plugin.colorizeText(true, "text")
    expect(chalk.green).toHaveBeenCalledTimes(1)
    expect(chalk.red).not.toHaveBeenCalled()
    expect(result).toBe("test-green")
  })
  it("should return a string with red color when the condition is false and the text is not empty", () => {
    const greenMock = chalk.green as unknown as jest.Mock
    greenMock.mockReturnValueOnce("test-green")

    const redMock = chalk.red as unknown as jest.Mock
    redMock.mockReturnValueOnce("test-red")

    const plugin = new ServerlessSesTemplatePlugin(serverless, options, logger)
    const result = plugin.colorizeText(false, "text")
    expect(chalk.green).not.toHaveBeenCalled()
    expect(chalk.red).toHaveBeenCalledTimes(1)
    expect(result).toBe("test-red")
  })
  it("should load templates and display them in a table", async () => {
    mockedSesTemplatePluginLogger.mockImplementation(() => {
      const loggerClass = jest.requireActual("../src/logger").default
      return new loggerClass(logger.log, logger.writeText, logger.progress)
    })
    const getRegionMock = jest
      .spyOn(mockedRuntimeUtils.prototype, "getRegion")
      .mockReturnValueOnce("us-west-2")

    const templates = [
      {
        TemplateName: "template1",
        CreatedTimestamp: new Date(),
      },
      {
        TemplateName: "template2",
        CreatedTimestamp: new Date(),
      },
    ]
    const loadTemplatesMock = jest
      .spyOn(mockedRequestHandler.prototype, "loadTemplates")
      .mockResolvedValueOnce(templates)

    const plugin = new ServerlessSesTemplatePlugin(serverless, options, logger)
    await plugin.list()

    expect(logger.progress.create).toHaveBeenCalledWith({
      message: "AWS SES template list for us-west-2 region",
      name: "sls-ses-template-list",
    })
    expect(getRegionMock).toHaveBeenCalledTimes(1)
    expect(loadTemplatesMock).toHaveBeenCalledTimes(1)
    expect(logger.writeText).toHaveBeenCalledTimes(1)
    expect(logger.progress.get).toHaveBeenCalledWith("sls-ses-template-list")
    expect(progressRemoveSpy).toHaveBeenCalledTimes(1)
    expect(logger.log.success).toHaveBeenCalledWith(
      "AWS SES template list finished",
    )
  })
  it("should print warning if no templates loaded", async () => {
    mockedSesTemplatePluginLogger.mockImplementation(() => {
      const loggerClass = jest.requireActual("../src/logger").default
      return new loggerClass(logger.log, logger.writeText, logger.progress)
    })
    const getRegionMock = jest
      .spyOn(mockedRuntimeUtils.prototype, "getRegion")
      .mockReturnValueOnce("us-west-2")

    const loadTemplatesMock = jest
      .spyOn(mockedRequestHandler.prototype, "loadTemplates")
      .mockResolvedValueOnce([])

    const plugin = new ServerlessSesTemplatePlugin(serverless, options, logger)
    await plugin.list()

    expect(logger.progress.create).toHaveBeenCalledWith({
      message: "AWS SES template list for us-west-2 region",
      name: "sls-ses-template-list",
    })
    expect(getRegionMock).toHaveBeenCalledTimes(2)
    expect(loadTemplatesMock).toHaveBeenCalledTimes(1)
    expect(logger.writeText).not.toHaveBeenCalled()
    expect(logger.progress.get).toHaveBeenCalledWith("sls-ses-template-list")
    expect(progressRemoveSpy).toHaveBeenCalledTimes(1)
    expect(logger.log.success).toHaveBeenCalledWith(
      "AWS SES template list finished",
    )
  })
  it("should throw if not AWS provider type runtime", async () => {
    serverless = {
      ...serverless,
      service: {
        provider: {
          ...serverless.service.provider,
          name: "unknown",
        },
      },
    } as unknown as ServerlessExtended
    const pluginOptions = {
      template: "some-title",
      ...options,
    }
    const plugin = new ServerlessSesTemplatePlugin(
      serverless,
      pluginOptions,
      logger,
    )
    const error: Error = await getError(async () => await plugin.deleteGiven())
    expect(serverless.classes.Error).toHaveBeenCalledTimes(1)
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe(
      "@haftahave/serverless-ses-template plugin supports only AWS",
    )
  })
})

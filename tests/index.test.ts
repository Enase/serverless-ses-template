import fs from "node:fs"
import path from "node:path"
import nock from "nock"
import chalk from "chalk"
import type * as SesPluginTypes from "../src/serverless-ses-template-plugin"
import ServerlessSesTemplatePlugin from "../src/index"
import RuntimeUtils from "../src/runtime-utils"
import RequestHandler from "../src/request-handler"
import SesTemplatePluginLogger from "../src/logger"

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
  }
  let logger: SesPluginTypes.ServerlessLogging
  let logSpy: SesPluginTypes.ServerlessLogging["log"]
  let writeTextSpy: jest.Mock
  let progress: SesPluginTypes.ServerlessLogging["progress"]
  let progressUpdateSpy: jest.Mock
  let progressRemoveSpy: jest.Mock
  let progressCreateSpy: jest.Mock
  let getConfigFileMock: jest.SpyInstance
  let isAutoDeployDisabledMock: jest.SpyInstance
  let serverless: SesPluginTypes.ServerlessExtended

  beforeEach(() => {
    nock.disableNetConnect()
    getConfigFileMock = jest
      .spyOn(mockedRuntimeUtils.prototype, "getConfigFile")
      .mockImplementation(() => "./ses-email-templates/index.js")
    isAutoDeployDisabledMock = jest
      .spyOn(mockedRuntimeUtils.prototype, "isAutoDeployDisabled")
      .mockImplementation(() => false)

    logSpy = jest.fn() as unknown as SesPluginTypes.ServerlessLogging["log"]
    writeTextSpy = jest.fn()
    progressUpdateSpy = jest.fn()
    progressRemoveSpy = jest.fn()
    progressCreateSpy = jest.fn()
    progress = {
      get: jest.fn((_name: string) => ({
        update: progressUpdateSpy,
        remove: progressRemoveSpy,
      })),
      create: progressCreateSpy,
    } as unknown as SesPluginTypes.ServerlessLogging["progress"]
    logger = {
      log: logSpy,
      progress,
      writeText: writeTextSpy,
    } as SesPluginTypes.ServerlessLogging
    serverless = {
      service: {
        provider: {
          name: "aws",
          region: "us-west-2",
          stage: "dev",
        },
        custom: {},
      } as unknown as SesPluginTypes.ServerlessExtended["service"],
      processedInput: { commands: ["ses-template"] },
      config: {
        servicePath: path.join(__dirname, "../examples/asset-management"),
      } as SesPluginTypes.ServerlessExtended["config"],
      getProvider: (_name: string) => undefined,
      utils: {
        fileExistsSync: jest.fn((_filePath: string) => {
          return true
        }),
        readFileSync: (filePath: string) =>
          fs.readFileSync(filePath).toString().trim(),
      } as unknown as SesPluginTypes.ServerlessExtended["utils"],
      classes: {
        Error: jest.fn((message: string) => Error(message)),
      } as unknown as SesPluginTypes.ServerlessExtended["classes"],
      cli: {
        log: jest.fn(),
      } as SesPluginTypes.ServerlessExtended["cli"],
      configSchemaHandler: {
        defineCustomProperties: jest.fn((_schema: any) => true),
      } as unknown as SesPluginTypes.ServerlessExtended["configSchemaHandler"],
      addServiceOutputSection: jest.fn(),
    } as unknown as SesPluginTypes.ServerlessExtended
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
      "../examples/asset-management/ses-email-templates",
      () => async () => expectedConfig,
    )
    await plugin.loadConfigurationFile()
    const result = await plugin.loadConfigurationFile()
    expect(serverless.utils.fileExistsSync).toHaveBeenCalledTimes(1)
    expect(getConfigFileMock).toHaveBeenCalledTimes(1)
    expect(result).toEqual(expectedConfig)
  })
  it("should throw an error when the configuration file is not found", async () => {
    const plugin = new ServerlessSesTemplatePlugin(
      serverless,
      options,
      {} as SesPluginTypes.ServerlessLogging,
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
      "../examples/asset-management/ses-email-templates",
      () => async () => {
        throw new Error("cannot load")
      },
    )
    const plugin = new ServerlessSesTemplatePlugin(
      serverless,
      options,
      {} as SesPluginTypes.ServerlessLogging,
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
    expect(plugin.syncTemplates).toHaveBeenCalledTimes(0)
    expect(result).toBeUndefined()
  })
  it("should update existing templates when they have changed", async () => {
    mockedSesTemplatePluginLogger.mockImplementation(() => {
      const loggerClass = jest.requireActual("../src/logger").default
      return new loggerClass(logger, logger.writeText, logger.progress)
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
      return new loggerClass(logger, logger.writeText, logger.progress)
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
      .mockImplementation((name) => `${name}-dev`)

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

    // Assert
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
    expect(writeTextSpy).toHaveBeenCalledTimes(0)
    expect(serverless.addServiceOutputSection).toHaveBeenCalledWith(
      "Serverless SES Template",
      expectedOutputSection,
    )
  })
  it("sync templates should delete templates", async () => {
    mockedSesTemplatePluginLogger.mockImplementation(() => {
      const loggerClass = jest.requireActual("../src/logger").default
      return new loggerClass(logger, logger.writeText, logger.progress)
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
      .mockImplementation((name) => `${name}-dev`)

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

    await plugin.syncTemplates(false)

    // Assert
    expect(logger.progress.create).toHaveBeenCalledWith({
      message: "AWS SES template synchronization",
      name: "sls-ses-template-sync",
    })
    expect(plugin.loadConfigurationFile).toHaveBeenCalledTimes(1)
    expect(shouldRemoveMissedMock).toHaveBeenCalledTimes(1)
    expect(plugin.getTemplatesToRemove).toHaveBeenCalledTimes(1)
    expect(plugin.info).toHaveBeenCalledTimes(0)
    expect(getEmailTemplateMock).toHaveBeenCalledTimes(1)
    expect(createTemplateMock).toHaveBeenCalledTimes(1)
    expect(addStageToTemplateNameMock).toHaveBeenCalledWith("test-template")
    expect(logger.progress.get).toHaveBeenCalledWith("sls-ses-template-sync")
    expect(progressRemoveSpy).toHaveBeenCalledTimes(1)
    expect(plugin.createSummary).toHaveBeenCalledTimes(3)
    expect(writeTextSpy).toHaveBeenCalledWith(
      `\n${[
        "Created templates: test-template-dev",
        "Deleted templates: del-template-dev",
      ].join("\n")}\n`,
    )
    expect(serverless.addServiceOutputSection).toHaveBeenCalledTimes(0)
  })
  it("sync templates should return void if no action done", async () => {
    mockedSesTemplatePluginLogger.mockImplementation(() => {
      const loggerClass = jest.requireActual("../src/logger").default
      return new loggerClass(logger, logger.writeText, logger.progress)
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
      .mockImplementation((name) => `${name}-dev`)

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

    // Assert
    expect(logger.progress.create).toHaveBeenCalledWith({
      message: "AWS SES template synchronization",
      name: "sls-ses-template-sync",
    })
    expect(plugin.loadConfigurationFile).toHaveBeenCalledTimes(1)
    expect(shouldRemoveMissedMock).toHaveBeenCalledTimes(1)
    expect(plugin.getTemplatesToRemove).toHaveBeenCalledTimes(0)
    expect(plugin.info).toHaveBeenCalledTimes(0)
    expect(getEmailTemplateMock).toHaveBeenCalledTimes(0)
    expect(createTemplateMock).toHaveBeenCalledTimes(0)
    expect(addStageToTemplateNameMock).toHaveBeenCalledTimes(0)
    expect(logger.progress.get).toHaveBeenCalledWith("sls-ses-template-sync")
    expect(progressRemoveSpy).toHaveBeenCalledTimes(1)
    expect(plugin.createSummary).toHaveBeenCalledTimes(3)
    expect(writeTextSpy).toHaveBeenCalledTimes(0)
    expect(serverless.addServiceOutputSection).toHaveBeenCalledTimes(0)
  })
  it("should successfully delete an AWS SES template when 'template' parameter is provided", async () => {
    const progressName = "sls-ses-template-delete"
    const templateName = "test-template"
    const expectedMessage = `AWS SES template "${templateName}" deleted`
    const pluginOptions = {
      template: templateName,
      ...options,
    }
    const plugin = new ServerlessSesTemplatePlugin(
      serverless,
      pluginOptions,
      logger,
    )
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

    await plugin.deleteGiven()

    expect(createProgressSpy).toHaveBeenCalledWith(
      progressName,
      "AWS SES template delete",
    )
    expect(deleteTemplateSpy).toHaveBeenCalledWith(templateName, progressName)
    expect(clearProgressSpy).toHaveBeenCalledWith(progressName)
    expect(logSuccessSpy).toHaveBeenCalledWith(expectedMessage)
  })
  it("should return void when template parameter is not provided", async () => {
    const plugin = new ServerlessSesTemplatePlugin(serverless, options, logger)
    const deleteTemplateSpy = jest.spyOn(
      mockedRequestHandler.prototype,
      "deleteTemplate",
    )
    const logErrorSpy = jest.spyOn(
      mockedSesTemplatePluginLogger.prototype,
      "logError",
    )

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
      .mockImplementation((_name) => true)

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

    // Assert that the account information is displayed correctly
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
  it("should return a string with green color when the condition is true and the text is not empty", () => {
    const greenMock = chalk.green as unknown as jest.Mock
    greenMock.mockReturnValueOnce("test-green")

    const redMock = chalk.red as unknown as jest.Mock
    redMock.mockReturnValueOnce("test-red")

    const plugin = new ServerlessSesTemplatePlugin(serverless, options, logger)
    const result = plugin.colorizeText(true, "text")
    expect(chalk.green).toHaveBeenCalledTimes(1)
    expect(chalk.red).toHaveBeenCalledTimes(0)
    expect(result).toBe("test-green")
  })
  it("should return a string with red color when the condition is false and the text is not empty", () => {
    const greenMock = chalk.green as unknown as jest.Mock
    greenMock.mockReturnValueOnce("test-green")

    const redMock = chalk.red as unknown as jest.Mock
    redMock.mockReturnValueOnce("test-red")

    const plugin = new ServerlessSesTemplatePlugin(serverless, options, logger)
    const result = plugin.colorizeText(false, "text")
    expect(chalk.green).toHaveBeenCalledTimes(0)
    expect(chalk.red).toHaveBeenCalledTimes(1)
    expect(result).toBe("test-red")
  })
})

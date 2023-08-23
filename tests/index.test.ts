import fs from "node:fs"
import path from "node:path"
import nock from "nock"
import type SesPluginTypes from "../src/serverless-ses-template-plugin"
import ServerlessSesTemplatePlugin from "../src/index"

// import SesTemplatePluginLogger from "../src/logger"
// import RequestHandler from "../src/request-handler"
// import RuntimeUtils from "../src/runtime-utils"

const defaultService = {
  provider: {
    name: "aws",
    region: "us-west-2",
    stage: "dev",
  },
  custom: {},
} as SesPluginTypes.ServerlessExtended["service"]

const mockServerless = (
  command: string = "",
  service: SesPluginTypes.ServerlessExtended["service"] = defaultService,
  providerMock = (_name: string) => ({}) as SesPluginTypes.Provider,
): SesPluginTypes.ServerlessExtended =>
  ({
    service,
    processedInput: { commands: ["ses-template", command] },
    config: {
      servicePath: path.join(__dirname, "../examples/asset-management"),
    } as SesPluginTypes.ServerlessExtended["config"],
    getProvider: (name) => providerMock(name),
    utils: {
      fileExistsSync: jest.fn((_filePath: string) => {
        return true
      }),
      readFileSync: (filePath: string) =>
        fs.readFileSync(filePath).toString().trim(),
    } as unknown as SesPluginTypes.ServerlessExtended["utils"],
    classes: {
      Error: jest.fn((message: string) => {
        throw new Error(message)
      }),
    } as unknown as SesPluginTypes.ServerlessExtended["classes"],
    cli: {
      log: jest.fn(),
    } as SesPluginTypes.ServerlessExtended["cli"],
    configSchemaHandler: {
      defineCustomProperties: jest.fn((_schema: any) => true),
    } as unknown as SesPluginTypes.ServerlessExtended["configSchemaHandler"],
  }) as SesPluginTypes.ServerlessExtended

describe("The `ServerlessSesTemplatePlugin` plugin", () => {
  let logger: SesPluginTypes.ServerlessLogging
  let logSpy: SesPluginTypes.ServerlessLogging["log"]
  let writeTextSpy: jest.Mock
  let progress: SesPluginTypes.ServerlessLogging["progress"]
  let progressUpdateSpy: jest.Mock
  let progressRemoveSpy: jest.Mock
  let progressCreateSpy: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    nock.disableNetConnect()

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
  })

  afterEach(() => {
    nock.cleanAll()
    nock.enableNetConnect()
  })

  it("should load the configuration file and return its content", async () => {
    // const serverless = {
    //   config: {
    //     servicePath: "/path/to/service",
    //   },
    //   utils: {
    //     fileExistsSync: jest.fn().mockReturnValue(true),
    //   },
    //   classes: {
    //     Error: jest.fn(),
    //   },
    // } as unknown as SesPluginTypes.ServerlessExtended
    const options = {} as SesPluginTypes.PluginOptions
    const serverless = mockServerless()
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
      "/path/to/service/default-ses-templates-config-file-path",
      () => async () => expectedConfig,
    )
    const result = await plugin.loadConfigurationFile()
    expect(result).toEqual(expectedConfig)
  })
  // it("should throw an error when the configuration file is not found", async () => {
  //   const serverless = {
  //     config: {
  //       servicePath: "/path/to/service",
  //     },
  //     utils: {
  //       fileExistsSync: jest.fn().mockReturnValue(false),
  //     },
  //     classes: {
  //       Error: jest.fn(),
  //     },
  //   } as unknown as SesPluginTypes.ServerlessExtended
  //   const options = {} as SesPluginTypes.PluginOptions
  //   const plugin = new ServerlessSesTemplatePlugin(serverless, options, {})
  //   try {
  //     await plugin.loadConfigurationFile()
  //   } catch (error) {
  //     expect(error).toBeInstanceOf(serverless.classes.Error)
  //     expect(error.message).toBe(
  //       'SES email templates configuration file not found by path "/path/to/service/default-ses-templates-config-file-path"',
  //     )
  //   }
  // })
})

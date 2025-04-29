import SesTemplatePluginLogger from "../src/logger.js"
import type { ServerlessLogging } from "../src/types.js"

describe("The `SesTemplatePluginLogger` class", () => {
  let logger: ServerlessLogging["log"]
  let progressUpdateSpy: jest.Mock
  let progressGetSpy: jest.Mock
  let progressCreateSpy: jest.Mock
  let progress: ServerlessLogging["progress"]

  beforeEach(() => {
    logger = {
      success: jest.fn(),
      warning: jest.fn(),
      error: jest.fn(),
    } as unknown as ServerlessLogging["log"]

    progressUpdateSpy = jest.fn()
    progressGetSpy = jest.fn((_name) => ({ update: progressUpdateSpy }))
    progressCreateSpy = jest.fn()

    progress = {
      get: progressGetSpy,
      create: progressCreateSpy,
    }
  })
  it("createProgress: should create progress when progress is available", () => {
    const slsLogger = new SesTemplatePluginLogger(logger, jest.fn(), progress)
    slsLogger.createProgress("name", "message")
    expect(progressGetSpy).toHaveBeenCalledTimes(0)
    expect(progressCreateSpy).toHaveBeenCalledWith({
      message: "message",
      name: "name",
    })
  })
  it("updateProgress: should update progress when progress is available", () => {
    const slsLogger = new SesTemplatePluginLogger(logger, jest.fn(), progress)
    slsLogger.updateProgress("name", "message")
    expect(progressCreateSpy).toHaveBeenCalledTimes(0)
    expect(progress.get).toHaveBeenCalledWith("name")
    expect(progressUpdateSpy).toHaveBeenCalledWith("message")
  })
  it("clearProgress: should remove progress when progress is available", () => {
    const progressRemoveSpy = jest.fn()
    const progressCreateSpy = jest.fn()
    const progress = {
      get: jest.fn((_name) => ({ remove: progressRemoveSpy })),
      create: progressCreateSpy,
    } as unknown as ServerlessLogging["progress"]
    const slsLogger = new SesTemplatePluginLogger(logger, jest.fn(), progress)
    slsLogger.clearProgress("name")
    expect(progress.get).toHaveBeenCalledWith("name")
    expect(progressRemoveSpy).toHaveBeenCalled()
  })
  it("logSuccess: should call the success method of the logger with the provided message", () => {
    const slsLogger = new SesTemplatePluginLogger(logger, jest.fn(), progress)
    const message = "Test message"
    slsLogger.logSuccess(message)
    expect(logger.success).toHaveBeenCalledWith(message)
  })
  it("logWarning: should call the warning method of the log object with a non-empty message", () => {
    const slsLogger = new SesTemplatePluginLogger(logger, jest.fn(), progress)
    const message = "This is a warning message"
    slsLogger.logWarning(message)
    expect(logger.warning).toHaveBeenCalledWith(message)
  })
  it("logError: should log the error message correctly", () => {
    const slsLogger = new SesTemplatePluginLogger(logger, jest.fn(), progress)
    const errorMessage = "This is an error message"
    slsLogger.logError(errorMessage)
    expect(logger.error).toHaveBeenCalledWith(errorMessage)
  })
})

import SesTemplatePluginLogger from "../src/logger"
import type * as SesPluginTypes from "../src/serverless-ses-template-plugin"

describe("The `SesTemplatePluginLogger` class", () => {
  it("createProgress: should create progress when progress is available", () => {
    const progressGetSpy = jest.fn()
    const progressCreateSpy = jest.fn()
    const logger =
      jest.fn() as unknown as SesPluginTypes.ServerlessLogging["log"]
    const slsLogger = new SesTemplatePluginLogger(logger, jest.fn(), {
      get: progressGetSpy,
      create: progressCreateSpy,
    })
    slsLogger.createProgress("name", "message")
    expect(progressGetSpy).toHaveBeenCalledTimes(0)
    expect(progressCreateSpy).toHaveBeenCalledWith({
      message: "message",
      name: "name",
    })
  })
  it("updateProgress: should update progress when progress is available", () => {
    const logger =
      jest.fn() as unknown as SesPluginTypes.ServerlessLogging["log"]
    const progressUpdateSpy = jest.fn()
    const progressCreateSpy = jest.fn()
    const progress = {
      get: jest.fn((_name) => ({ update: progressUpdateSpy })),
      create: progressCreateSpy,
    } as unknown as SesPluginTypes.ServerlessLogging["progress"]
    const slsLogger = new SesTemplatePluginLogger(logger, jest.fn(), progress)
    slsLogger.updateProgress("name", "message")
    expect(progressCreateSpy).toHaveBeenCalledTimes(0)
    expect(progress.get).toHaveBeenCalledWith("name")
    expect(progressUpdateSpy).toHaveBeenCalledWith("message")
  })
  it("clearProgress: should remove progress when progress is available", () => {
    const progressRemoveSpy = jest.fn()
    const progressCreateSpy = jest.fn()
    const logger =
      jest.fn() as unknown as SesPluginTypes.ServerlessLogging["log"]
    const progress = {
      get: jest.fn((_name) => ({ remove: progressRemoveSpy })),
      create: progressCreateSpy,
    } as unknown as SesPluginTypes.ServerlessLogging["progress"]
    const slsLogger = new SesTemplatePluginLogger(logger, jest.fn(), progress)
    slsLogger.clearProgress("name")
    expect(progress.get).toHaveBeenCalledWith("name")
    expect(progressRemoveSpy).toHaveBeenCalled()
  })
  it("logSuccess: should call the success method of the logger with the provided message", () => {
    const logger = {
      success: jest.fn(),
    } as unknown as SesPluginTypes.ServerlessLogging["log"]
    const progress = jest.fn() as unknown as SesPluginTypes.ServerlessLogging["progress"]
    const slsLogger = new SesTemplatePluginLogger(logger, jest.fn(), progress)
    const message = "Test message"
    slsLogger.logSuccess(message)
    expect(logger.success).toHaveBeenCalledWith(message)
  })
  it("logWarning: should call the warning method of the log object with a non-empty message", () => {
    const logger = {
      warning: jest.fn(),
    } as unknown as SesPluginTypes.ServerlessLogging["log"]
    const progress = jest.fn() as unknown as SesPluginTypes.ServerlessLogging["progress"]
    const slsLogger = new SesTemplatePluginLogger(logger, jest.fn(), progress)
    const message = "This is a warning message"
    slsLogger.logWarning(message)
    expect(logger.warning).toHaveBeenCalledWith(message)
  })
  it("logError: should log the error message correctly", () => {
    const logger = {
      error: jest.fn(),
    } as unknown as SesPluginTypes.ServerlessLogging["log"]
    const progress = jest.fn() as unknown as SesPluginTypes.ServerlessLogging["progress"]
    const slsLogger = new SesTemplatePluginLogger(logger, jest.fn(), progress)
    const errorMessage = "This is an error message"
    slsLogger.logError(errorMessage)
    expect(logger.error).toHaveBeenCalledWith(errorMessage)
  })
})

import SesTemplatePluginLogger from "../src/logger"
import type * as SesPluginTypes from "../src/serverless-ses-template-plugin"

describe("The `SesTemplatePluginLogger` class", () => {
  it("createProgress: should log info message when progress is not defined", () => {
    const logger = {
      info: jest.fn(),
    } as unknown as SesPluginTypes.ServerlessLogging["log"]
    const logSpy = jest.spyOn(logger, "info")
    const slsLogger = new SesTemplatePluginLogger(logger, jest.fn())
    slsLogger.createProgress("name", "message")
    expect(logSpy).toHaveBeenCalledWith("SesTemplate: message...")
  })
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
  it("updateProgress: should call logger.info with provided message when progress is not defined", () => {
    const logger = {
      info: jest.fn(),
    } as unknown as SesPluginTypes.ServerlessLogging["log"]
    const logSpy = jest.spyOn(logger, "info")
    const slsLogger = new SesTemplatePluginLogger(logger, jest.fn())
    slsLogger.updateProgress("name", "message")
    expect(logSpy).toHaveBeenCalledWith("SesTemplate: message")
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
  it("clearProgress: should not throw an error when progress is undefined", () => {
    const logger = console as unknown as SesPluginTypes.ServerlessLogging["log"]
    const slsLogger = new SesTemplatePluginLogger(logger, jest.fn())
    expect(() => slsLogger.clearProgress("name")).not.toThrow()
  })
  it("logSuccess: should log success message with correct input", () => {
    const logger = {
      success: jest.fn(),
    } as unknown as SesPluginTypes.ServerlessLogging["log"]
    const logSuccessSpy = jest.spyOn(logger, "success")
    const slsLogger = new SesTemplatePluginLogger(logger, jest.fn())
    const message = "Test message"
    slsLogger.logSuccess(message)
    expect(logSuccessSpy).toHaveBeenCalledWith(message)
  })
  it("logWarning: should log a non-empty string message", () => {
    const logger = {
      warning: jest.fn(),
    } as unknown as SesPluginTypes.ServerlessLogging["log"]
    const logSpy = jest.spyOn(logger, "warning")
    const slsLogger = new SesTemplatePluginLogger(logger, jest.fn())
    const message = "This is a warning message"
    slsLogger.logWarning(message)
    expect(logSpy).toHaveBeenCalledWith(message)
    expect(logSpy).toHaveBeenCalledTimes(1)
  })
  it("logError: should log the same non-empty string message passed as argument", () => {
    const logger = {
      error: jest.fn(),
    } as unknown as SesPluginTypes.ServerlessLogging["log"]
    const logSpy = jest.spyOn(logger, "error")
    const slsLogger = new SesTemplatePluginLogger(logger, jest.fn())
    const message = "Test error message"
    slsLogger.logError(message)
    expect(logSpy).toHaveBeenCalledWith(message)
  })
})

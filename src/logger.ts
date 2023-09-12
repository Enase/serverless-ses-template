import type * as SesPluginTypes from "./serverless-ses-template-plugin"

class SesTemplatePluginLogger {
  private readonly log: SesPluginTypes.ServerlessLogging["log"]
  public readonly writeText: SesPluginTypes.ServerlessLogging["writeText"]
  private readonly progress: SesPluginTypes.ServerlessLogging["progress"]

  constructor(
    logger: SesPluginTypes.ServerlessLogging["log"],
    writeText: SesPluginTypes.ServerlessLogging["writeText"],
    progress: SesPluginTypes.ServerlessLogging["progress"],
  ) {
    this.log = logger
    this.writeText = writeText
    this.progress = progress
  }

  createProgress(name: string, message: string): void {
    this.progress.create({
      message,
      name,
    })
  }

  updateProgress(name: string, message: string): void {
    this.progress.get(name).update(message)
  }

  clearProgress(name: string): void {
    this.progress.get(name).remove()
  }

  logSuccess(message: string): void {
    this.log.success(message)
  }

  logWarning(message: string): void {
    this.log.warning(message)
  }

  logError(message: string): void {
    this.log.error(message)
  }
}

export default SesTemplatePluginLogger

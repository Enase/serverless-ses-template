import SesTemplatePlugin from "./SesTemplatePlugin"

class SesTemplatePluginLogger {
  private readonly log: SesTemplatePlugin.ServerlessLogging["log"]
  public readonly writeText: SesTemplatePlugin.ServerlessLogging["writeText"]
  private readonly progress?: SesTemplatePlugin.ServerlessLogging["progress"]

  constructor(
    logger: SesTemplatePlugin.ServerlessLogging["log"],
    writeText: SesTemplatePlugin.ServerlessLogging["writeText"],
    progress?: SesTemplatePlugin.ServerlessLogging["progress"],
  ) {
    this.log = logger
    this.writeText = writeText
    this.progress = progress
  }

  createProgress(name: string, message: string): void {
    if (!this.progress) {
      this.log.info(`SesTemplate: ${message}...`)
    } else {
      this.progress.create({
        message,
        name,
      })
    }
  }

  updateProgress(name: string, message: string): void {
    if (!this.progress) {
      this.log.info(`SesTemplate: ${message}`)
    } else {
      this.progress.get(name).update(message)
    }
  }

  clearProgress(name: string): void {
    if (this.progress) {
      this.progress.get(name).remove()
    }
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

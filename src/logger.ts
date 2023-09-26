import type { ServerlessLogging } from "./types"

class SesTemplatePluginLogger {
  private readonly log: ServerlessLogging["log"]
  public readonly writeText: ServerlessLogging["writeText"]
  private readonly progress: ServerlessLogging["progress"]

  constructor(
    logger: ServerlessLogging["log"],
    writeText: ServerlessLogging["writeText"],
    progress: ServerlessLogging["progress"],
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

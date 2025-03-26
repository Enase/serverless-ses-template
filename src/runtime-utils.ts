import type { PluginOptions, ServerlessExtended } from "./types.js"

const defaultSesTemplatesConfigFilePath = "./ses-email-templates/index.js"

class RuntimeUtils {
  private readonly removeMissed: boolean
  private readonly filter: string
  private readonly configFile: string
  private readonly disableAutoDeploy: boolean
  private readonly canAddStage: boolean
  private readonly region: string
  private readonly stage: string

  constructor(serverless: ServerlessExtended, options: PluginOptions) {
    const {
      processedInput: { commands },
      service: {
        custom: {
          sesTemplates: {
            region: sesTemplatesRegion = "",
            removeMissed = false,
            addStage = false,
            configFile = defaultSesTemplatesConfigFilePath,
            disableAutoDeploy = false,
          } = {},
        } = {},
        provider: { region, stage },
      },
    } = serverless

    this.region = (options.sesTemplatesRegion ||
      sesTemplatesRegion ||
      options.region ||
      region) as string
    this.stage = options.stage ?? stage

    this.removeMissed = (
      commands.includes("deploy")
        ? options.removeMissed !== undefined
        : removeMissed
    ) as boolean
    this.filter = commands.includes("list") ? options.filter ?? "" : ""
    this.canAddStage = Boolean(addStage)
    this.configFile = (options.sesTemplateConfig ?? configFile) as string
    this.disableAutoDeploy = disableAutoDeploy as boolean
  }

  addStageToTemplateName(templateName: string): string {
    return this.canAddStage ? `${templateName}_${this.stage}` : templateName
  }

  isTemplateFromCurrentStage(templateName: string): boolean {
    return this.canAddStage
      ? String(templateName).endsWith(`_${this.stage}`)
      : true
  }

  getFilter(): string {
    return this.filter
  }

  getConfigFile(): string {
    return this.configFile
  }

  getStage(): string {
    return this.stage
  }

  getRegion(): string {
    return this.region
  }

  shouldRemoveMissed(): boolean {
    return this.removeMissed
  }

  isAutoDeployDisabled(): boolean {
    return this.disableAutoDeploy
  }
}

export default RuntimeUtils

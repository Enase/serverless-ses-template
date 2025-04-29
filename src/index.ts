import path from "node:path"
import chalk from "chalk"
import Table from "cli-table"
import commandsConfig from "./commands-config.js"
import SesTemplatePluginLogger from "./logger.js"
import RequestHandler from "./request-handler.js"
import RuntimeUtils from "./runtime-utils.js"
import type {
  ConfigFunction,
  Configuration,
  ConfigurationItem,
  PluginOptions,
  ServerlessExtended,
  ServerlessHooksDefinition,
  ServerlessLogging,
} from "./types.js"

const defaultSesTemplatesDeployHook = "before:deploy:deploy"

class ServerlessSesTemplatePlugin {
  private readonly AWS = "aws"
  private readonly serverless: ServerlessExtended
  private readonly options: PluginOptions
  private readonly commands: typeof commandsConfig
  private readonly logger: SesTemplatePluginLogger

  private requestHandler?: RequestHandler
  private runtimeUtils?: RuntimeUtils
  private configuration?: Configuration
  private hooks: ServerlessHooksDefinition

  constructor(
    serverless: ServerlessExtended,
    options: PluginOptions,
    { log, progress, writeText }: ServerlessLogging,
  ) {
    this.serverless = serverless
    this.options = options
    this.logger = new SesTemplatePluginLogger(log, writeText, progress)

    const newCustomPropSchema = {
      type: "object",
      properties: {
        sesTemplates: {
          type: "object",
          properties: {
            addStage: {
              type: "boolean",
            },
            removeMissed: {
              type: "boolean",
            },
            configFile: {
              type: "string",
            },
            deployHook: {
              type: "string",
            },
            disableAutoDeploy: {
              type: "boolean",
            },
            region: {
              type: "string",
            },
          },
          additionalProperties: false,
        },
      },
    }
    serverless.configSchemaHandler.defineCustomProperties(newCustomPropSchema)

    this.commands = commandsConfig

    const {
      service: {
        custom: {
          sesTemplates: { deployHook = defaultSesTemplatesDeployHook } = {},
        } = {},
      },
    } = this.serverless

    this.hooks = {
      "after:info:info": this.info.bind(this),
      "ses-template:deploy:syncTemplates": this.syncTemplates.bind(this),
      "ses-template:delete:deleteGiven": this.deleteGiven.bind(this),
      "ses-template:list:list": this.list.bind(this),
      [deployHook]: this.syncTemplatesOnDeploy.bind(this),
      "before:remove:remove": this.deleteTemplatesOnRemove.bind(this),
    }
  }

  private getRuntimeUtils(): RuntimeUtils {
    if (!this.runtimeUtils) {
      this.runtimeUtils = new RuntimeUtils(this.serverless, this.options)
    }
    return this.runtimeUtils
  }

  private getRequestHandler(): RequestHandler {
    if (!this.requestHandler) {
      const providerName = this.serverless.service.provider.name
      if (providerName !== this.AWS) {
        throw new this.serverless.classes.Error(
          "@haftahave/serverless-ses-template plugin supports only AWS",
        )
      }
      this.requestHandler = new RequestHandler(
        this.serverless.getProvider(providerName),
        this.getRuntimeUtils(),
        this.logger,
      )
    }
    return this.requestHandler
  }

  async loadConfigurationFile(): Promise<Configuration> {
    if (!this.configuration) {
      const fileFullPath = path.join(
        this.serverless.config.servicePath,
        this.getRuntimeUtils().getConfigFile(),
      )
      if (!this.serverless.utils.fileExistsSync(fileFullPath)) {
        throw new this.serverless.classes.Error(
          `SES email templates configuration file not found by path "${fileFullPath}"`,
        )
      }

      try {
        const configFunction = (await import(fileFullPath)) as ConfigFunction
        if (configFunction.default === undefined) {
          throw new Error('Configuration file should export "default" function')
        }
        this.configuration = await configFunction.default(
          this.serverless,
          this.options,
        )
        return this.configuration
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        throw new this.serverless.classes.Error(message)
      }
    }
    return this.configuration
  }

  async syncTemplatesOnDeploy(): Promise<void> {
    if (this.getRuntimeUtils().isAutoDeployDisabled()) {
      return Promise.resolve()
    }
    return this.syncTemplates(true)
  }

  async syncTemplates(isDeploy = false): Promise<void> {
    const progressName = "sls-ses-template-sync"
    this.logger.createProgress(progressName, "AWS SES template synchronization")

    const configuration = await this.loadConfigurationFile()

    const templatesToSync = configuration.map(
      (templateConfig: ConfigurationItem) =>
        this.getRuntimeUtils().addStageToTemplateName(templateConfig.name),
    )

    const templatesToRemove = this.getRuntimeUtils().shouldRemoveMissed()
      ? await this.getTemplatesToRemove(templatesToSync)
      : []

    const updatedTemplates: string[] = []
    const createdTemplates: string[] = []
    const syncTemplatePromises = configuration.map(
      async (templateConfig: ConfigurationItem) => {
        const templateName = this.getRuntimeUtils().addStageToTemplateName(
          templateConfig.name,
        )
        const oldTemplate =
          await this.getRequestHandler().getEmailTemplate(templateName)
        if (oldTemplate !== null) {
          updatedTemplates.push(templateName)
          return (await this.getRequestHandler().updateTemplate(
            templateConfig,
            progressName,
          )) as unknown
        }
        createdTemplates.push(templateName)
        return (await this.getRequestHandler().createTemplate(
          templateConfig,
          progressName,
        )) as unknown
      },
    )

    const deleteTemplatePromises = templatesToRemove.map(
      (templateName: string) =>
        this.getRequestHandler().deleteTemplate(templateName, progressName),
    )

    await Promise.all([...syncTemplatePromises, ...deleteTemplatePromises])

    this.logger.clearProgress(progressName)

    const summaryList = [
      ...this.createSummary("Created templates:", createdTemplates),
      ...this.createSummary("Updated templates:", updatedTemplates),
      ...this.createSummary("Deleted templates:", templatesToRemove),
    ]

    if (!summaryList.length) {
      return
    }

    if (isDeploy) {
      this.serverless.addServiceOutputSection(
        "Serverless SES Template",
        summaryList,
      )
      await this.info()
    } else {
      this.logger.writeText(`\n${summaryList.join("\n")}\n`)
    }
  }

  createSummary(title: string, items: readonly string[]): string[] {
    const result = []
    if (items.length) {
      result.push(title)
      result.push(...items)
    }
    return result
  }

  async deleteGiven(): Promise<void> {
    const progressName = "sls-ses-template-delete"
    this.logger.createProgress(progressName, "AWS SES template delete")

    if (!this.options.template) {
      this.logger.logError("template parameter is required")
      return
    }

    const result = (await this.getRequestHandler().deleteTemplate(
      this.options.template,
      progressName,
    )) as unknown

    this.logger.clearProgress(progressName)
    if (result) {
      this.logger.logSuccess(
        `AWS SES template "${this.options.template}" deleted`,
      )
    }
  }

  async deleteTemplatesOnRemove(): Promise<void> {
    if (this.getRuntimeUtils().isAutoDeployDisabled()) {
      return Promise.resolve()
    }

    const progressName = "sls-ses-template-remove"
    this.logger.createProgress(progressName, "AWS SES template remove")

    const configuration = await this.loadConfigurationFile()

    const templatesToRemove = configuration.map(
      (templateConfig: ConfigurationItem) =>
        this.getRuntimeUtils().addStageToTemplateName(templateConfig.name),
    )

    await Promise.all(
      templatesToRemove.map((templateName: string) =>
        this.getRequestHandler().deleteTemplate(templateName, progressName),
      ),
    )

    this.logger.clearProgress(progressName)
    const summaryList = [
      ...this.createSummary("Deleted templates:", templatesToRemove),
    ]

    if (!summaryList.length) {
      return Promise.resolve()
    }
    this.logger.logSuccess(
      `AWS SES template remove finished\n${summaryList.join("\n")}`,
    )
  }

  async getTemplatesToRemove(
    templatesToSync: readonly string[],
  ): Promise<string[]> {
    const templateList = await this.getRequestHandler().loadTemplates()
    const currentTemplates = templateList.map(
      (templateObject) => templateObject.TemplateName,
    )
    return currentTemplates.filter(
      (templateName) =>
        !templatesToSync.includes(templateName) &&
        this.getRuntimeUtils().isTemplateFromCurrentStage(templateName),
    )
  }

  async info(): Promise<void> {
    const {
      DedicatedIpAutoWarmupEnabled: dedicatedIpAutoWarmupEnabled,
      EnforcementStatus: enforcementStatus,
      ProductionAccessEnabled: productionAccessEnabled,
      SendingEnabled: sendingEnabled,
      Details: {
        MailType: mailType = undefined,
        WebsiteURL: websiteURL = undefined,
        ReviewDetails: { Status: renewStatus = "" } = {},
      } = {},
    } = await this.getRequestHandler().getAccount()
    const summaryList: string[] = []
    renewStatus &&
      summaryList.push(
        `Renew Status: ${this.colorizeText(
          renewStatus === "GRANTED",
          renewStatus,
        )}`,
      )
    summaryList.push(
      `Production Access Enabled: ${this.colorizeText(
        productionAccessEnabled,
        String(productionAccessEnabled),
      )}`,
    )
    summaryList.push(
      `Sending Enabled: ${this.colorizeText(
        sendingEnabled,
        String(sendingEnabled),
      )}`,
    )
    summaryList.push(
      `Dedicated Ip Auto Warmup Enabled: ${this.colorizeText(
        dedicatedIpAutoWarmupEnabled,
        String(dedicatedIpAutoWarmupEnabled),
      )}`,
    )
    summaryList.push(
      `Enforcement Status: ${this.colorizeText(
        enforcementStatus === "HEALTHY",
        enforcementStatus,
      )}`,
    )
    mailType && summaryList.push(`Mail Type: ${mailType}`)
    websiteURL && summaryList.push(`Website URL: ${websiteURL}`)

    this.serverless.addServiceOutputSection(
      "Serverless SES Status",
      summaryList,
    )
  }

  colorizeText(condition: boolean, text: string): string {
    return condition ? chalk.green(text) : chalk.red(text)
  }

  async list(): Promise<void> {
    const progressName = "sls-ses-template-list"
    this.logger.createProgress(
      progressName,
      `AWS SES template list for ${this.getRuntimeUtils().getRegion()} region`,
    )

    const templates = await this.getRequestHandler().loadTemplates()

    if (templates.length) {
      const maxTitleLength = templates.reduce((acc, template) => {
        const titleLength = template.TemplateName.length + 2
        if (acc < titleLength) {
          return titleLength
        }
        return acc
      }, 10)

      const table = new Table({
        style: { head: ["green"] },
        head: ["Template Name", "Created At"],
        colWidths: [maxTitleLength, 31],
      })

      templates.forEach((template) => {
        table.push([
          template.TemplateName,
          template.CreatedTimestamp.toUTCString(),
        ])
      })

      this.logger.writeText(`\n${table.toString()}`)
    } else {
      this.logger.logWarning(
        `Templates not found in "${this.getRuntimeUtils().getRegion()}" region`,
      )
    }
    this.logger.clearProgress(progressName)
    this.logger.logSuccess("AWS SES template list finished")
  }
}

export default ServerlessSesTemplatePlugin

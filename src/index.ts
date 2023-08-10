import chalk from "chalk"
import path from "path"
import Table from "cli-table"
import { commandsConfig } from "./commands-config"
import type SesPluginTypes from "./SesTemplatePlugin"
import SesTemplatePluginLogger from "./logger"
import RequestHandler from "./request-handler"
import RuntimeUtils from "./runtime-utils"

const defaultSesTemplatesDeployHook = "before:deploy:deploy"

class ServerlessSesTemplatePlugin {
  private readonly AWS = "aws"
  private readonly serverless: SesPluginTypes.ServerlessExtended
  private readonly options: SesPluginTypes.PluginOptions
  private readonly commands: typeof commandsConfig
  private readonly logger: SesTemplatePluginLogger

  private requestHandler?: RequestHandler
  private runtimeUtils?: RuntimeUtils
  private configuration?: SesPluginTypes.Configuration
  private hooks: SesPluginTypes.ServerlessHooksDefinition

  constructor(
    serverless: SesPluginTypes.ServerlessExtended,
    options: SesPluginTypes.PluginOptions,
    { log, progress, writeText }: SesPluginTypes.ServerlessLogging,
  ) {
    this.serverless = serverless
    this.options = options
    const logger = log || {
      error: serverless.cli.log,
      warning: serverless.cli.log,
      notice: serverless.cli.log,
      info: serverless.cli.log,
      debug: serverless.cli.log,
      verbose: serverless.cli.log,
      success: serverless.cli.log,
    }
    this.logger = new SesTemplatePluginLogger(logger, writeText, progress)

    if (this.serverless.configSchemaHandler) {
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
    }

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
          "ses-template plugin supports only AWS",
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

  async loadConfigurationFile(): Promise<SesPluginTypes.Configuration> {
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
        const configFunction = await import(fileFullPath)
        this.configuration = (await configFunction(
          this.serverless,
          this.options,
        )) as SesPluginTypes.Configuration
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

  async syncTemplates(isDeploy: boolean = false): Promise<void> {
    const progressName = "sls-ses-template-sync"
    this.logger.createProgress(progressName, "AWS SES template synchronization")

    const configuration = await this.loadConfigurationFile()

    const templatesToSync = configuration.map((templateConfig) =>
      this.getRuntimeUtils().addStageToTemplateName(templateConfig.name),
    )

    const templatesToRemove = this.getRuntimeUtils().shouldRemoveMissed()
      ? await this.getTemplatesToRemove(templatesToSync || [])
      : []

    const updatedTemplates: string[] = []
    const createdTemplates: string[] = []
    const syncTemplatePromises = configuration.map(async (templateConfig) => {
      const templateName = this.getRuntimeUtils().addStageToTemplateName(
        templateConfig.name,
      )
      const oldTemplate = await this.getRequestHandler().getEmailTemplate(
        templateName,
      )
      if (oldTemplate !== null) {
        updatedTemplates.push(templateName)
        return this.getRequestHandler().updateTemplate(
          templateConfig,
          progressName,
        )
      }
      createdTemplates.push(templateName)
      return this.getRequestHandler().createTemplate(
        templateConfig,
        progressName,
      )
    })

    const deleteTemplatePromises = templatesToRemove.map(
      (templateName: string) =>
        this.getRequestHandler().deleteTemplate(templateName, progressName),
    )

    await Promise.all([
      ...(syncTemplatePromises || []),
      ...deleteTemplatePromises,
    ])

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
      summaryList.push("----------------------------------------")
      if (this.serverless.addServiceOutputSection) {
        this.serverless.addServiceOutputSection(
          "Serverless SES Template",
          summaryList,
        )
        await this.info()
      }
    } else {
      this.logger.writeText(`\n${summaryList.join("\n")}\n`)
    }
  }

  createSummary(title: string, items: string[]): string[] {
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

    const result = await this.getRequestHandler().deleteTemplate(
      this.options.template,
      progressName,
    )

    this.logger.clearProgress(progressName)
    if (result) {
      this.logger.logSuccess(
        `AWS SES template "${this.options.template}" deleted`,
      )
    }
  }

  async getTemplatesToRemove(templatesToSync: string[]): Promise<string[]> {
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
    if (!this.serverless.addServiceOutputSection) {
      return
    }
    const {
      DedicatedIpAutoWarmupEnabled: dedicatedIpAutoWarmupEnabled,
      EnforcementStatus: enforcementStatus,
      ProductionAccessEnabled: productionAccessEnabled,
      SendingEnabled: sendingEnabled,
      Details: {
        MailType: mailType,
        WebsiteURL: websiteURL,
        ReviewDetails: { Status: renewStatus = "" } = {},
      } = {},
    } = await this.getRequestHandler().getAccount()
    const summaryList = []
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

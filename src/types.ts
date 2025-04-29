import type Serverless from "serverless"
import type { Options } from "serverless"
import type { Logging } from "serverless/classes/Plugin.js"
import type AwsProvider from "serverless/plugins/aws/provider/awsProvider.js"
import type Service from "serverless/classes/Service.js"

export interface PluginOptions extends Options {
  sesTemplatesRegion?: string
  removeMissed?: string | boolean
  filter?: string
  sesTemplateConfig?: string
  template?: string
}

export interface CustomConfig extends Service.Custom {
  sesTemplates?: {
    region?: string
    removeMissed?: boolean
    addStage?: boolean
    configFile?: string
    disableAutoDeploy?: boolean
  }
}

export interface ServerlessLogging extends Logging {
  _dummy?: string
}

export declare class ServerlessExtended extends Serverless {
  custom: CustomConfig
  addServiceOutputSection: (name: string, massages: string[]) => void
  processedInput: {
    commands: string[]
  }

  classes: {
    Error: typeof Error
  }
}

export type ServerlessHooksDefinition = Record<string, (arg?: any) => any>

export interface ConfigurationItem {
  name: string
  subject: string
  html: string
  text: string
}
export type Configuration = ConfigurationItem[]

export interface ProviderError {
  message: string
  providerErrorCodeExtension: string
}

export type AnyParameters = object

export declare class Provider extends AwsProvider {
  public request(
    this: void,
    service: string,
    method: string,
    params?: AnyParameters,
    options?: {
      useCache?: boolean | undefined
      region?: string | undefined
      stage?: string | undefined
    },
  ): Promise<any>
}

export interface SesGetAccountResponse {
  DedicatedIpAutoWarmupEnabled: boolean
  EnforcementStatus: string
  ProductionAccessEnabled: boolean
  SendingEnabled: boolean
  Details?: {
    MailType: string
    WebsiteURL: string
    ReviewDetails?: {
      Status: string
    }
  }
}

export interface LoadTemplatesParams {
  maxItems?: number
  token?: string
  [key: string]: any
}

export interface SesTemplateResponseItem {
  TemplateName: string
  CreatedTimestamp: Date
}
export interface SesListEmailTemplatesResponse {
  TemplatesMetadata: SesTemplateResponseItem[]
  NextToken: string
}

export interface SesGetEmailTemplateResponse {
  TemplateName: string
  TemplateContent: {
    Subject: string
    Text: string
    Html: string
  }
}

export interface ConfigFunction {
  default: (
    serverless: ServerlessExtended,
    _options: AnyParameters,
  ) => Promise<Configuration>
}

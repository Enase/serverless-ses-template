import Serverless from "serverless"
import type { Options } from "serverless"
import type { Logging } from "serverless/classes/Plugin"
import type AwsProvider from "serverless/plugins/aws/provider/awsProvider"
import Service from "serverless/classes/Service"

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
export interface ServerlessLogging extends Logging {}

export declare class ServerlessExtended extends Serverless {
  custom: CustomConfig
  addServiceOutputSection?: (name: string, massages: string[]) => void
  processedInput: {
    commands: string[]
  }

  classes: {
    Error: typeof Error
  }
}

export type ServerlessHooksDefinition = {
  [key: string]: (arg?: any) => any
}

export type ConfigurationItem = {
  name: string
  subject: string
  html: string
  text: string
}
export type Configuration = ConfigurationItem[]

export type ProviderError = {
  message: string
  providerErrorCodeExtension: string
}
declare class Provider extends AwsProvider {
  request(
    service: string,
    method: string,
    params?: {},
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

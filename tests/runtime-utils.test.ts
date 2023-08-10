import RuntimeUtils from "../src/runtime-utils"
import SesPluginTypes from "../src/SesTemplatePlugin"

describe("The `RuntimeUtils` class", () => {
  it("should return the same template name when canAddStage is false", () => {
    const runtimeUtils = new RuntimeUtils(
      {
        processedInput: { commands: [] },
        service: {
          custom: {
            sesTemplates: {
              addStage: false,
            },
          },
          provider: { region: "test-region", stage: "test-stage" },
        },
      } as unknown as SesPluginTypes.ServerlessExtended,
      {} as SesPluginTypes.PluginOptions,
    )
    const templateName = "test-template"
    const result = runtimeUtils.addStageToTemplateName(templateName)
    expect(result).toBe(templateName)
  })
  it("should append the stage to the template name when canAddStage is true", () => {
    const runtimeUtils = new RuntimeUtils(
      {
        processedInput: { commands: [] },
        service: {
          custom: {
            sesTemplates: {
              addStage: true,
            },
          },
          provider: { region: "test-region", stage: "test-stage" },
        },
      } as unknown as SesPluginTypes.ServerlessExtended,
      {} as SesPluginTypes.PluginOptions,
    )
    const templateName = "test-template"
    const result = runtimeUtils.addStageToTemplateName(templateName)
    expect(result).toBe(`${templateName}_test-stage`)
  })
  it("should return true when canAddStage is false", () => {
    const runtimeUtils = new RuntimeUtils(
      {
        processedInput: { commands: [] },
        service: {
          custom: {
            sesTemplates: {
              addStage: false,
            },
          },
          provider: { region: "test-region", stage: "test-stage" },
        },
      } as unknown as SesPluginTypes.ServerlessExtended,
      {} as SesPluginTypes.PluginOptions,
    )
    const templateName = "test-template"
    const result = runtimeUtils.isTemplateFromCurrentStage(templateName)
    expect(result).toBe(true)
  })
  it("should return true when canAddStage is true and templateName ends with stage", () => {
    const runtimeUtils = new RuntimeUtils(
      {
        processedInput: { commands: [] },
        service: {
          custom: {
            sesTemplates: {
              addStage: true,
            },
          },
          provider: { region: "test-region", stage: "test-stage" },
        },
      } as unknown as SesPluginTypes.ServerlessExtended,
      {} as SesPluginTypes.PluginOptions,
    )
    const templateName = "test-template_test-stage"
    const result = runtimeUtils.isTemplateFromCurrentStage(templateName)
    expect(result).toBe(true)
  })

  it("should return false when canAddStage is true and templateName does not end with stage", () => {
    const runtimeUtils = new RuntimeUtils(
      {
        processedInput: { commands: [] },
        service: {
          custom: {
            sesTemplates: {
              addStage: true,
            },
          },
          provider: { region: "test-region", stage: "test-stage" },
        },
      } as unknown as SesPluginTypes.ServerlessExtended,
      {} as SesPluginTypes.PluginOptions,
    )
    const templateName = "test-template"
    const result = runtimeUtils.isTemplateFromCurrentStage(templateName)
    expect(result).toBe(false)
  })
  it("should return the value of filter property", () => {
    const runtimeUtils = new RuntimeUtils(
      {
        processedInput: { commands: ["list"] },
        service: {
          custom: {
            sesTemplates: {
              removeMissed: false,
              addStage: false,
              configFile: "defaultSesTemplatesConfigFilePath",
              disableAutoDeploy: false,
            },
          },
          provider: { region: "test-region", stage: "test-stage" },
        },
      } as unknown as SesPluginTypes.ServerlessExtended,
      { filter: "filter" } as SesPluginTypes.PluginOptions,
    )
    expect(runtimeUtils.getFilter()).toBe("filter")
  })
  it("should ignore the value of filter property", () => {
    const runtimeUtils = new RuntimeUtils(
      {
        processedInput: { commands: [] },
        service: {
          custom: {
            sesTemplates: {
              removeMissed: false,
              addStage: false,
              configFile: "defaultSesTemplatesConfigFilePath",
              disableAutoDeploy: false,
            },
          },
          provider: { region: "test-region", stage: "test-stage" },
        },
      } as unknown as SesPluginTypes.ServerlessExtended,
      { filter: "filter" } as SesPluginTypes.PluginOptions,
    )
    expect(runtimeUtils.getFilter()).toBe("")
  })
  it("should return the configFile property value when it exists and is a string", () => {
    const runtimeUtils = new RuntimeUtils(
      {
        processedInput: { commands: [] },
        service: {
          custom: {
            sesTemplates: {
              configFile: "test-config-file",
            },
          },
          provider: { region: "test-region", stage: "test-stage" },
        },
      } as unknown as SesPluginTypes.ServerlessExtended,
      {} as SesPluginTypes.PluginOptions,
    )
    const result = runtimeUtils.getConfigFile()
    expect(result).toBe("test-config-file")
  })
  it("should return the value of the stage and region property when it is set", () => {
    const runtimeUtils = new RuntimeUtils(
      {
        processedInput: { commands: [] },
        service: {
          custom: {
            sesTemplates: {
              addStage: false,
            },
          },
          provider: { region: "test-region", stage: "test-stage" },
        },
      } as unknown as SesPluginTypes.ServerlessExtended,
      {} as SesPluginTypes.PluginOptions,
    )
    expect(runtimeUtils.getStage()).toBe("test-stage")
    expect(runtimeUtils.getRegion()).toBe("test-region")
  })
  it("should return the value of removeMissed when deploy command is included and removeMissed is not undefined", () => {
    const runtimeUtils = new RuntimeUtils(
      {
        processedInput: { commands: ["deploy"] },
        service: {
          custom: {
            sesTemplates: {
              removeMissed: false,
            },
          },
          provider: { region: "test-region", stage: "test-stage" },
        },
      } as unknown as SesPluginTypes.ServerlessExtended,
      { removeMissed: true } as SesPluginTypes.PluginOptions,
    )
    const result = runtimeUtils.shouldRemoveMissed()
    expect(result).toBe(true)
  })
  it("should return the value of removeMissed when command is not 'deploy'", () => {
    const runtimeUtils = new RuntimeUtils(
      {
        processedInput: { commands: ["list"] },
        service: {
          custom: {
            sesTemplates: {
              removeMissed: true,
            },
          },
          provider: { region: "test-region", stage: "test-stage" },
        },
      } as unknown as SesPluginTypes.ServerlessExtended,
      {} as SesPluginTypes.PluginOptions,
    )
    const result = runtimeUtils.shouldRemoveMissed()
    expect(result).toBe(true)
  })
  it("should return false when disableAutoDeploy is false", () => {
    const runtimeUtils = new RuntimeUtils(
      {
        processedInput: { commands: [] },
        service: {
          custom: {
            sesTemplates: {
              disableAutoDeploy: false,
            },
          },
          provider: { region: "test-region", stage: "test-stage" },
        },
      } as unknown as SesPluginTypes.ServerlessExtended,
      {} as SesPluginTypes.PluginOptions,
    )
    const result = runtimeUtils.isAutoDeployDisabled()
    expect(result).toBe(false)
  })
})

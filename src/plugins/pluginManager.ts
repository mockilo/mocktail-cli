export interface Plugin {
  name: string;
  version: string;
  description: string;
  author?: string;
  dependencies?: string[];
  hooks?: PluginHooks;
  generators?: CustomGenerator[];
  validators?: CustomValidator[];
  transformers?: CustomTransformer[];
}

export interface PluginHooks {
  beforeGeneration?: (context: GenerationContext) => Promise<void> | void;
  afterGeneration?: (context: GenerationContext, data: any) => Promise<void> | void;
  beforeSchemaParse?: (schemaPath: string) => Promise<void> | void;
  afterSchemaParse?: (models: any) => Promise<void> | void;
  onError?: (error: Error, context: any) => Promise<void> | void;
}

export interface CustomGenerator {
  name: string;
  description: string;
  fieldTypes: string[];
  generate: (field: any, context: GenerationContext) => any;
  validate?: (field: any) => boolean;
}

export interface CustomValidator {
  name: string;
  description: string;
  validate: (data: any, schema: any) => ValidationResult;
}

export interface CustomTransformer {
  name: string;
  description: string;
  inputFormats: string[];
  outputFormats: string[];
  transform: (data: any, options: any) => any;
}

export interface GenerationContext {
  modelName: string;
  fieldName: string;
  fieldType: string;
  isArray: boolean;
  isOptional: boolean;
  constraints?: any;
  relations?: any[];
  seed?: number;
  locale?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PluginConfig {
  enabled: boolean;
  options?: Record<string, any>;
}

export class PluginManager {
  private static instance: PluginManager;
  private plugins: Map<string, Plugin> = new Map();
  private pluginConfigs: Map<string, PluginConfig> = new Map();
  private loadedPlugins: Set<string> = new Set();

  static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }

  async loadPlugin(pluginPath: string): Promise<void> {
    try {
      const plugin = await this.importPlugin(pluginPath);
      this.validatePlugin(plugin);
      
      this.plugins.set(plugin.name, plugin);
      this.pluginConfigs.set(plugin.name, { enabled: true });
      this.loadedPlugins.add(plugin.name);
      
      console.log(`✅ Plugin loaded: ${plugin.name} v${plugin.version}`);
    } catch (error) {
      console.error(`❌ Failed to load plugin from ${pluginPath}:`, error);
      throw error;
    }
  }

  async loadPluginsFromDirectory(directory: string): Promise<void> {
    const fs = require('fs');
    const path = require('path');
    
    try {
      const files = fs.readdirSync(directory);
      const pluginFiles = files.filter((file: string) => 
        file.endsWith('.js') || file.endsWith('.ts')
      );
      
      for (const file of pluginFiles) {
        const pluginPath = path.join(directory, file);
        await this.loadPlugin(pluginPath);
      }
    } catch (error) {
      console.error(`❌ Failed to load plugins from directory ${directory}:`, error);
    }
  }

  private async importPlugin(pluginPath: string): Promise<Plugin> {
    // Dynamic import for ES modules
    const pluginModule = await import(pluginPath);
    return pluginModule.default || pluginModule;
  }

  private validatePlugin(plugin: any): void {
    if (!plugin.name) {
      throw new Error('Plugin must have a name');
    }
    
    if (!plugin.version) {
      throw new Error('Plugin must have a version');
    }
    
    if (!plugin.description) {
      throw new Error('Plugin must have a description');
    }
    
    // Validate hooks
    if (plugin.hooks) {
      const validHooks = [
        'beforeGeneration', 'afterGeneration', 'beforeSchemaParse', 
        'afterSchemaParse', 'onError'
      ];
      
      for (const hookName of Object.keys(plugin.hooks)) {
        if (!validHooks.includes(hookName)) {
          throw new Error(`Invalid hook: ${hookName}`);
        }
      }
    }
    
    // Validate generators
    if (plugin.generators) {
      for (const generator of plugin.generators) {
        if (!generator.name || !generator.generate) {
          throw new Error('Generator must have name and generate function');
        }
      }
    }
  }

  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  getEnabledPlugins(): Plugin[] {
    return this.getAllPlugins().filter(plugin => 
      this.pluginConfigs.get(plugin.name)?.enabled
    );
  }

  enablePlugin(name: string): void {
    const config = this.pluginConfigs.get(name);
    if (config) {
      config.enabled = true;
    }
  }

  disablePlugin(name: string): void {
    const config = this.pluginConfigs.get(name);
    if (config) {
      config.enabled = false;
    }
  }

  configurePlugin(name: string, options: Record<string, any>): void {
    const config = this.pluginConfigs.get(name);
    if (config) {
      config.options = { ...config.options, ...options };
    }
  }

  async executeHook(hookName: keyof PluginHooks, context: any): Promise<void> {
    const enabledPlugins = this.getEnabledPlugins();
    
    for (const plugin of enabledPlugins) {
      if (plugin.hooks && plugin.hooks[hookName]) {
        try {
          await (plugin.hooks[hookName] as any)(context);
        } catch (error) {
          console.error(`❌ Plugin ${plugin.name} hook ${hookName} failed:`, error);
        }
      }
    }
  }

  getCustomGenerators(): CustomGenerator[] {
    const generators: CustomGenerator[] = [];
    const enabledPlugins = this.getEnabledPlugins();
    
    for (const plugin of enabledPlugins) {
      if (plugin.generators) {
        generators.push(...plugin.generators);
      }
    }
    
    return generators;
  }

  getCustomValidators(): CustomValidator[] {
    const validators: CustomValidator[] = [];
    const enabledPlugins = this.getEnabledPlugins();
    
    for (const plugin of enabledPlugins) {
      if (plugin.validators) {
        validators.push(...plugin.validators);
      }
    }
    
    return validators;
  }

  getCustomTransformers(): CustomTransformer[] {
    const transformers: CustomTransformer[] = [];
    const enabledPlugins = this.getEnabledPlugins();
    
    for (const plugin of enabledPlugins) {
      if (plugin.transformers) {
        transformers.push(...plugin.transformers);
      }
    }
    
    return transformers;
  }

  findGeneratorForField(fieldType: string, fieldName: string): CustomGenerator | null {
    const generators = this.getCustomGenerators();
    
    for (const generator of generators) {
      if (generator.fieldTypes.includes(fieldType) || 
          generator.fieldTypes.includes('*')) {
        if (!generator.validate || generator.validate({ type: fieldType, name: fieldName })) {
          return generator;
        }
      }
    }
    
    return null;
  }

  async validateData(data: any, schema: any): Promise<ValidationResult> {
    const validators = this.getCustomValidators();
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: []
    };
    
    for (const validator of validators) {
      try {
        const validationResult = validator.validate(data, schema);
        
        if (!validationResult.valid) {
          result.valid = false;
          result.errors.push(...validationResult.errors);
        }
        
        result.warnings.push(...validationResult.warnings);
      } catch (error) {
        result.valid = false;
        result.errors.push(`Validator ${validator.name} failed: ${error}`);
      }
    }
    
    return result;
  }

  async transformData(data: any, inputFormat: string, outputFormat: string, options: any = {}): Promise<any> {
    const transformers = this.getCustomTransformers();
    
    for (const transformer of transformers) {
      if (transformer.inputFormats.includes(inputFormat) && 
          transformer.outputFormats.includes(outputFormat)) {
        try {
          return await transformer.transform(data, options);
        } catch (error) {
          console.error(`❌ Transformer ${transformer.name} failed:`, error);
        }
      }
    }
    
    throw new Error(`No transformer found for ${inputFormat} -> ${outputFormat}`);
  }

  getPluginInfo(): string {
    const plugins = this.getAllPlugins();
    const enabledCount = this.getEnabledPlugins().length;
    
    let info = `📦 Plugin Manager Status:\n`;
    info += `  Total Plugins: ${plugins.length}\n`;
    info += `  Enabled Plugins: ${enabledCount}\n\n`;
    
    if (plugins.length > 0) {
      info += `🔌 Loaded Plugins:\n`;
      for (const plugin of plugins) {
        const status = this.pluginConfigs.get(plugin.name)?.enabled ? '✅' : '❌';
        info += `  ${status} ${plugin.name} v${plugin.version} - ${plugin.description}\n`;
      }
    }
    
    return info;
  }

  unloadPlugin(name: string): void {
    this.plugins.delete(name);
    this.pluginConfigs.delete(name);
    this.loadedPlugins.delete(name);
  }

  clearPlugins(): void {
    this.plugins.clear();
    this.pluginConfigs.clear();
    this.loadedPlugins.clear();
  }
}

export const pluginManager = PluginManager.getInstance();

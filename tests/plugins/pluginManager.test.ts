import { PluginManager, Plugin, CustomGenerator, GenerationContext } from '../../src/plugins/pluginManager';

describe('PluginManager', () => {
  let pluginManager: PluginManager;

  beforeEach(() => {
    // Reset singleton instance for each test
    (PluginManager as any).instance = undefined;
    pluginManager = PluginManager.getInstance();
  });

  describe('Singleton Pattern', () => {
    test('should return same instance', () => {
      const instance1 = PluginManager.getInstance();
      const instance2 = PluginManager.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('Plugin Registration', () => {
    test('should register a valid plugin', () => {
      const mockPlugin: Plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
      };

      // Manually add plugin to simulate loading
      (pluginManager as any).plugins.set(mockPlugin.name, mockPlugin);
      (pluginManager as any).pluginConfigs.set(mockPlugin.name, { enabled: true });

      const retrievedPlugin = pluginManager.getPlugin('test-plugin');
      expect(retrievedPlugin).toBeDefined();
      expect(retrievedPlugin?.name).toBe('test-plugin');
    });

    test('should list all plugins', () => {
      const plugin1: Plugin = {
        name: 'plugin1',
        version: '1.0.0',
        description: 'Plugin 1',
      };

      const plugin2: Plugin = {
        name: 'plugin2',
        version: '2.0.0',
        description: 'Plugin 2',
      };

      (pluginManager as any).plugins.set(plugin1.name, plugin1);
      (pluginManager as any).plugins.set(plugin2.name, plugin2);

      const allPlugins = pluginManager.getAllPlugins();
      expect(allPlugins).toHaveLength(2);
      expect(allPlugins.map(p => p.name)).toContain('plugin1');
      expect(allPlugins.map(p => p.name)).toContain('plugin2');
    });

    test('should return undefined for non-existent plugin', () => {
      const plugin = pluginManager.getPlugin('non-existent');
      expect(plugin).toBeUndefined();
    });
  });

  describe('Plugin Enable/Disable', () => {
    beforeEach(() => {
      const mockPlugin: Plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
      };

      (pluginManager as any).plugins.set(mockPlugin.name, mockPlugin);
      (pluginManager as any).pluginConfigs.set(mockPlugin.name, { enabled: true });
    });

    test('should disable plugin', () => {
      pluginManager.disablePlugin('test-plugin');

      const enabledPlugins = pluginManager.getEnabledPlugins();
      expect(enabledPlugins).toHaveLength(0);
    });

    test('should enable plugin', () => {
      pluginManager.disablePlugin('test-plugin');
      pluginManager.enablePlugin('test-plugin');

      const enabledPlugins = pluginManager.getEnabledPlugins();
      expect(enabledPlugins).toHaveLength(1);
      expect(enabledPlugins[0]?.name).toBe('test-plugin');
    });

    test('should only list enabled plugins', () => {
      const plugin2: Plugin = {
        name: 'plugin2',
        version: '1.0.0',
        description: 'Plugin 2',
      };

      (pluginManager as any).plugins.set(plugin2.name, plugin2);
      (pluginManager as any).pluginConfigs.set(plugin2.name, { enabled: false });

      const enabledPlugins = pluginManager.getEnabledPlugins();
      expect(enabledPlugins).toHaveLength(1);
      expect(enabledPlugins[0]?.name).toBe('test-plugin');
    });
  });

  describe('Plugin Configuration', () => {
    beforeEach(() => {
      const mockPlugin: Plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
      };

      (pluginManager as any).plugins.set(mockPlugin.name, mockPlugin);
      (pluginManager as any).pluginConfigs.set(mockPlugin.name, { enabled: true, options: {} });
    });

    test('should configure plugin options', () => {
      const options = { setting1: 'value1', setting2: 42 };
      pluginManager.configurePlugin('test-plugin', options);

      const config = (pluginManager as any).pluginConfigs.get('test-plugin');
      expect(config.options).toEqual(options);
    });

    test('should merge plugin options', () => {
      pluginManager.configurePlugin('test-plugin', { setting1: 'value1' });
      pluginManager.configurePlugin('test-plugin', { setting2: 'value2' });

      const config = (pluginManager as any).pluginConfigs.get('test-plugin');
      expect(config.options).toEqual({ setting1: 'value1', setting2: 'value2' });
    });

    test('should handle configuring non-existent plugin gracefully', () => {
      expect(() => {
        pluginManager.configurePlugin('non-existent', { key: 'value' });
      }).not.toThrow();
    });
  });

  describe('Plugin Hooks', () => {
    test('should execute beforeGeneration hook', async () => {
      const hookFn = jest.fn();
      const mockPlugin: Plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        hooks: {
          beforeGeneration: hookFn,
        },
      };

      (pluginManager as any).plugins.set(mockPlugin.name, mockPlugin);
      (pluginManager as any).pluginConfigs.set(mockPlugin.name, { enabled: true });

      const context: GenerationContext = {
        modelName: 'User',
        fieldName: 'name',
        fieldType: 'String',
        isArray: false,
        isOptional: false,
      };

      await pluginManager.executeHook('beforeGeneration', context);

      expect(hookFn).toHaveBeenCalledWith(context);
      expect(hookFn).toHaveBeenCalledTimes(1);
    });

    test('should execute afterGeneration hook', async () => {
      const hookFn = jest.fn();
      const mockPlugin: Plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        hooks: {
          afterGeneration: hookFn,
        },
      };

      (pluginManager as any).plugins.set(mockPlugin.name, mockPlugin);
      (pluginManager as any).pluginConfigs.set(mockPlugin.name, { enabled: true });

      const context: GenerationContext = {
        modelName: 'User',
        fieldName: 'name',
        fieldType: 'String',
        isArray: false,
        isOptional: false,
      };
      const data = { name: 'Test User' };

      await pluginManager.executeHook('afterGeneration', { context, data });

      expect(hookFn).toHaveBeenCalledWith({ context, data });
    });

    test('should execute hooks in order for multiple plugins', async () => {
      const executionOrder: string[] = [];

      const plugin1: Plugin = {
        name: 'plugin1',
        version: '1.0.0',
        description: 'Plugin 1',
        hooks: {
          beforeGeneration: async () => {
            executionOrder.push('plugin1');
          },
        },
      };

      const plugin2: Plugin = {
        name: 'plugin2',
        version: '1.0.0',
        description: 'Plugin 2',
        hooks: {
          beforeGeneration: async () => {
            executionOrder.push('plugin2');
          },
        },
      };

      (pluginManager as any).plugins.set(plugin1.name, plugin1);
      (pluginManager as any).plugins.set(plugin2.name, plugin2);
      (pluginManager as any).pluginConfigs.set(plugin1.name, { enabled: true });
      (pluginManager as any).pluginConfigs.set(plugin2.name, { enabled: true });

      await pluginManager.executeHook('beforeGeneration', {});

      expect(executionOrder).toEqual(['plugin1', 'plugin2']);
    });

    test('should not execute hooks for disabled plugins', async () => {
      const hookFn = jest.fn();
      const mockPlugin: Plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        hooks: {
          beforeGeneration: hookFn,
        },
      };

      (pluginManager as any).plugins.set(mockPlugin.name, mockPlugin);
      (pluginManager as any).pluginConfigs.set(mockPlugin.name, { enabled: false });

      await pluginManager.executeHook('beforeGeneration', {});

      expect(hookFn).not.toHaveBeenCalled();
    });

    test('should handle async hooks', async () => {
      const hookFn = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      const mockPlugin: Plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        hooks: {
          beforeGeneration: hookFn,
        },
      };

      (pluginManager as any).plugins.set(mockPlugin.name, mockPlugin);
      (pluginManager as any).pluginConfigs.set(mockPlugin.name, { enabled: true });

      await pluginManager.executeHook('beforeGeneration', {});

      expect(hookFn).toHaveBeenCalled();
    });
  });

  describe('Custom Generators', () => {
    test('should register custom generators', () => {
      const customGenerator: CustomGenerator = {
        name: 'email-generator',
        description: 'Generates email addresses',
        fieldTypes: ['email', 'Email'],
        generate: (_field: any, _context: GenerationContext) => {
          return `test@example.com`;
        },
      };

      const mockPlugin: Plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        generators: [customGenerator],
      };

      (pluginManager as any).plugins.set(mockPlugin.name, mockPlugin);

      const plugin = pluginManager.getPlugin('test-plugin');
      expect(plugin?.generators).toBeDefined();
      expect(plugin?.generators).toHaveLength(1);
      expect(plugin?.generators![0]!.name).toBe('email-generator');
    });

    test('should retrieve generators from plugin', () => {
      const mockPlugin: Plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        generators: [
          {
            name: 'gen1',
            description: 'Generator 1',
            fieldTypes: ['type1'],
            generate: () => 'value1',
          },
          {
            name: 'gen2',
            description: 'Generator 2',
            fieldTypes: ['type2'],
            generate: () => 'value2',
          },
        ],
      };

      (pluginManager as any).plugins.set(mockPlugin.name, mockPlugin);
      (pluginManager as any).pluginConfigs.set(mockPlugin.name, { enabled: true });

      const generators = pluginManager.getCustomGenerators();
      expect(generators).toHaveLength(2);
    });
  });

  describe('Plugin Metadata', () => {
    test('should store plugin author', () => {
      const mockPlugin: Plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        author: 'Test Author',
      };

      (pluginManager as any).plugins.set(mockPlugin.name, mockPlugin);

      const plugin = pluginManager.getPlugin('test-plugin');
      expect(plugin?.author).toBe('Test Author');
    });

    test('should store plugin dependencies', () => {
      const mockPlugin: Plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        dependencies: ['dependency1', 'dependency2'],
      };

      (pluginManager as any).plugins.set(mockPlugin.name, mockPlugin);

      const plugin = pluginManager.getPlugin('test-plugin');
      expect(plugin?.dependencies).toEqual(['dependency1', 'dependency2']);
    });
  });

  describe('Edge Cases', () => {
    test('should handle plugin with all features', () => {
      const fullPlugin: Plugin = {
        name: 'full-plugin',
        version: '1.0.0',
        description: 'Full featured plugin',
        author: 'Test Author',
        dependencies: ['dep1'],
        hooks: {
          beforeGeneration: jest.fn(),
          afterGeneration: jest.fn(),
        },
        generators: [
          {
            name: 'custom-gen',
            description: 'Custom generator',
            fieldTypes: ['custom'],
            generate: () => 'custom value',
          },
        ],
        validators: [
          {
            name: 'custom-validator',
            description: 'Custom validator',
            validate: () => ({ valid: true, errors: [], warnings: [] }),
          },
        ],
        transformers: [
          {
            name: 'custom-transformer',
            description: 'Custom transformer',
            inputFormats: ['json'],
            outputFormats: ['xml'],
            transform: (data: any) => data,
          },
        ],
      };

      (pluginManager as any).plugins.set(fullPlugin.name, fullPlugin);
      (pluginManager as any).pluginConfigs.set(fullPlugin.name, { enabled: true });

      const plugin = pluginManager.getPlugin('full-plugin');
      expect(plugin).toBeDefined();
      expect(plugin?.hooks).toBeDefined();
      expect(plugin?.generators).toHaveLength(1);
      expect(plugin?.validators).toHaveLength(1);
      expect(plugin?.transformers).toHaveLength(1);
    });

    test('should handle plugin with no optional fields', () => {
      const minimalPlugin: Plugin = {
        name: 'minimal-plugin',
        version: '1.0.0',
        description: 'Minimal plugin',
      };

      (pluginManager as any).plugins.set(minimalPlugin.name, minimalPlugin);

      const plugin = pluginManager.getPlugin('minimal-plugin');
      expect(plugin).toBeDefined();
      expect(plugin?.hooks).toBeUndefined();
      expect(plugin?.generators).toBeUndefined();
    });
  });
});

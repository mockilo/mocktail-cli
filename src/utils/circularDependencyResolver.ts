import { Model } from '../types';

export interface DependencyNode {
  name: string;
  model: Model;
  dependencies: Set<string>;
  dependents: Set<string>;
  visited: boolean;
  inStack: boolean;
  cycleId?: string;
}

export interface Cycle {
  id: string;
  nodes: string[];
  type: 'self-reference' | 'simple-cycle' | 'complex-cycle';
  strength: 'weak' | 'strong'; // weak = optional relations, strong = required relations
}

export interface CycleResolutionStrategy {
  name: string;
  description: string;
  resolve: (cycle: Cycle, nodes: Map<string, DependencyNode>) => ResolutionPlan;
}

export interface ResolutionPlan {
  strategy: string;
  breakPoints: Array<{
    from: string;
    to: string;
    field: string;
    action: 'defer' | 'partial' | 'lazy' | 'break';
  }>;
  generationOrder: string[];
  deferredRelations: Array<{
    model: string;
    field: string;
    targetModel: string;
  }>;
}

export class CircularDependencyResolver {
  private strategies: Map<string, CycleResolutionStrategy> = new Map();
  private preferredStrategy: string = 'smart-break';

  constructor(options: { maxDepth?: number; preferredStrategy?: string } = {}) {
    this.preferredStrategy = options.preferredStrategy || 'smart-break';
    this.registerDefaultStrategies();
  }

  // Main method to resolve circular dependencies
  resolveDependencies(models: Model[]): {
    generationOrder: Model[];
    resolutionPlan: ResolutionPlan | null;
    cycles: Cycle[];
  } {
    // 1. Build dependency graph
    const nodes = this.buildDependencyGraph(models);
    
    // 2. Detect cycles
    const cycles = this.detectCycles(nodes);
    
    // 3. If no cycles, return simple topological order
    if (cycles.length === 0) {
      return {
        generationOrder: this.topologicalSort(nodes),
        resolutionPlan: null,
        cycles: []
      };
    }

    // 4. Resolve cycles using preferred strategy
    const strategy = this.strategies.get(this.preferredStrategy);
    if (!strategy) {
      throw new Error(`Unknown resolution strategy: ${this.preferredStrategy}`);
    }

    // 5. Apply resolution strategy to the most complex cycle first
    const primaryCycle = this.selectPrimaryCycle(cycles);
    const resolutionPlan = strategy.resolve(primaryCycle, nodes);

    // 6. Apply resolution plan and get final order
    const finalOrder = this.applyResolutionPlan(resolutionPlan, nodes);

    return {
      generationOrder: finalOrder,
      resolutionPlan,
      cycles
    };
  }

  private buildDependencyGraph(models: Model[]): Map<string, DependencyNode> {
    const nodes = new Map<string, DependencyNode>();

    // Initialize nodes
    for (const model of models) {
      nodes.set(model.name, {
        name: model.name,
        model,
        dependencies: new Set(),
        dependents: new Set(),
        visited: false,
        inStack: false
      });
    }

    // Build dependencies
    for (const model of models) {
      const node = nodes.get(model.name)!;
      
      for (const field of model.fields) {
        // Check if this field references another model
        if (field.isRelation && nodes.has(field.type)) {
          // This model depends on the referenced model
          node.dependencies.add(field.type);
          
          // The referenced model has this model as a dependent
          const targetNode = nodes.get(field.type)!;
          targetNode.dependents.add(model.name);
        }

        // Check for foreign key relationships
        if (field.relationFromFields && field.relationFromFields.length > 0) {
          // This is a foreign key field, so this model depends on the target
          if (nodes.has(field.type)) {
            node.dependencies.add(field.type);
            const targetNode = nodes.get(field.type)!;
            targetNode.dependents.add(model.name);
          }
        }
      }
    }

    return nodes;
  }

  private detectCycles(nodes: Map<string, DependencyNode>): Cycle[] {
    const cycles: Cycle[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    for (const [nodeName, node] of nodes) {
      if (!visited.has(nodeName)) {
        this.dfsDetectCycles(node, nodes, visited, recursionStack, [], cycles);
      }
    }

    return cycles;
  }

  private dfsDetectCycles(
    node: DependencyNode,
    nodes: Map<string, DependencyNode>,
    visited: Set<string>,
    recursionStack: Set<string>,
    path: string[],
    cycles: Cycle[]
  ): void {
    visited.add(node.name);
    recursionStack.add(node.name);
    path.push(node.name);

    for (const depName of node.dependencies) {
      const depNode = nodes.get(depName);
      if (!depNode) continue;

      if (recursionStack.has(depName)) {
        // Found a cycle
        const cycleStart = path.indexOf(depName);
        const cycleNodes = path.slice(cycleStart);
        cycleNodes.push(depName); // Complete the cycle

        const cycle: Cycle = {
          id: `cycle-${cycles.length + 1}`,
          nodes: cycleNodes,
          type: this.determineCycleType(cycleNodes),
          strength: this.determineCycleStrength(cycleNodes, nodes)
        };

        cycles.push(cycle);
      } else if (!visited.has(depName)) {
        this.dfsDetectCycles(depNode, nodes, visited, recursionStack, path, cycles);
      }
    }

    recursionStack.delete(node.name);
    path.pop();
  }

  private determineCycleType(cycleNodes: string[]): 'self-reference' | 'simple-cycle' | 'complex-cycle' {
    if (cycleNodes.length === 2 && cycleNodes[0] === cycleNodes[1]) {
      return 'self-reference';
    } else if (cycleNodes.length <= 3) {
      return 'simple-cycle';
    } else {
      return 'complex-cycle';
    }
  }

  private determineCycleStrength(cycleNodes: string[], nodes: Map<string, DependencyNode>): 'weak' | 'strong' {
    // Check if any of the relationships in the cycle are optional
    for (let i = 0; i < cycleNodes.length - 1; i++) {
      const fromNodeName = cycleNodes[i];
      if (!fromNodeName) continue;
      const fromNode = nodes.get(fromNodeName);
      const toNodeName = cycleNodes[i + 1];
      
      if (fromNode) {
        // Check if there's an optional relationship
        for (const field of fromNode.model.fields) {
          if (field.type === toNodeName && field.isOptional) {
            return 'weak';
          }
        }
      }
    }
    return 'strong';
  }

  private selectPrimaryCycle(cycles: Cycle[]): Cycle {
    // Select the most complex cycle to resolve first
    return cycles.reduce((primary, current) => {
      // Prioritize by complexity, then by strength
      if (current.type === 'complex-cycle' && primary.type !== 'complex-cycle') {
        return current;
      }
      if (current.strength === 'strong' && primary.strength === 'weak') {
        return current;
      }
      if (current.nodes.length > primary.nodes.length) {
        return current;
      }
      return primary;
    });
  }

  private topologicalSort(nodes: Map<string, DependencyNode>): Model[] {
    const result: Model[] = [];
    const visited = new Set<string>();
    const temp = new Set<string>();

    const visit = (nodeName: string) => {
      if (temp.has(nodeName)) {
        // This shouldn't happen if cycles are resolved
        return;
      }
      if (visited.has(nodeName)) {
        return;
      }

      temp.add(nodeName);
      const node = nodes.get(nodeName);
      if (node) {
        for (const depName of node.dependencies) {
          visit(depName);
        }
        temp.delete(nodeName);
        visited.add(nodeName);
        result.push(node.model);
      }
    };

    for (const nodeName of nodes.keys()) {
      if (!visited.has(nodeName)) {
        visit(nodeName);
      }
    }

    return result;
  }

  private applyResolutionPlan(plan: ResolutionPlan, nodes: Map<string, DependencyNode>): Model[] {
    // Apply the resolution plan by modifying the dependency graph
    for (const breakPoint of plan.breakPoints) {
      const fromNode = nodes.get(breakPoint.from);
      const toNode = nodes.get(breakPoint.to);
      
      if (fromNode && toNode) {
        switch (breakPoint.action) {
          case 'break':
            fromNode.dependencies.delete(breakPoint.to);
            toNode.dependents.delete(breakPoint.from);
            break;
          case 'defer':
            // Keep the dependency but mark it as deferred
            // This will be handled during generation
            break;
        }
      }
    }

    // Return the models in the specified generation order
    return plan.generationOrder
      .map(name => nodes.get(name)?.model)
      .filter((model): model is Model => model !== undefined);
  }

  private registerDefaultStrategies(): void {
    // Strategy 1: Smart Break - Break at optional relationships
    this.strategies.set('smart-break', {
      name: 'Smart Break',
      description: 'Break cycles at optional relationships, prefer weak cycles',
      resolve: (cycle, nodes) => {
        const breakPoints: ResolutionPlan['breakPoints'] = [];
        const deferredRelations: ResolutionPlan['deferredRelations'] = [];

        // Find the best place to break the cycle
        for (let i = 0; i < cycle.nodes.length - 1; i++) {
          const fromName = cycle.nodes[i];
          const toName = cycle.nodes[i + 1];
          if (!fromName || !toName) continue;
          const fromNode = nodes.get(fromName);

          if (fromNode) {
            // Look for optional relationships to break
            for (const field of fromNode.model.fields) {
              if (field.type === toName && field.isOptional) {
                breakPoints.push({
                  from: fromName,
                  to: toName,
                  field: field.name,
                  action: 'defer'
                });

                deferredRelations.push({
                  model: fromName,
                  field: field.name,
                  targetModel: toName
                });
                break;
              }
            }
          }
        }

        // If no optional relationships found, break at the weakest link
        if (breakPoints.length === 0) {
          const fromName = cycle.nodes[0];
          const toName = cycle.nodes[1];
          if (!fromName || !toName) return { strategy: 'smart-break', breakPoints, generationOrder: cycle.nodes, deferredRelations };
          const fromNode = nodes.get(fromName);

          if (fromNode) {
            const field = fromNode.model.fields.find(f => f.type === toName);
            if (field) {
              breakPoints.push({
                from: fromName,
                to: toName,
                field: field.name,
                action: 'break'
              });
            }
          }
        }

        // Generate order: dependencies first, then dependents
        const generationOrder = [...cycle.nodes];
        
        return {
          strategy: 'smart-break',
          breakPoints,
          generationOrder,
          deferredRelations
        };
      }
    });

    // Strategy 2: Lazy Loading - Generate partial objects first
    this.strategies.set('lazy-loading', {
      name: 'Lazy Loading',
      description: 'Generate objects with null relations first, then populate later',
      resolve: (cycle, nodes) => {
        const breakPoints: ResolutionPlan['breakPoints'] = [];
        const deferredRelations: ResolutionPlan['deferredRelations'] = [];

        // Mark all cycle relationships as lazy
        for (let i = 0; i < cycle.nodes.length - 1; i++) {
          const fromName = cycle.nodes[i];
          const toName = cycle.nodes[i + 1];
          if (!fromName || !toName) continue;
          const fromNode = nodes.get(fromName);

          if (fromNode) {
            for (const field of fromNode.model.fields) {
              if (field.type === toName) {
                breakPoints.push({
                  from: fromName,
                  to: toName,
                  field: field.name,
                  action: 'lazy'
                });

                deferredRelations.push({
                  model: fromName,
                  field: field.name,
                  targetModel: toName
                });
              }
            }
          }
        }

        return {
          strategy: 'lazy-loading',
          breakPoints,
          generationOrder: cycle.nodes,
          deferredRelations
        };
      }
    });

    // Strategy 3: Partial References - Generate with IDs only
    this.strategies.set('partial-references', {
      name: 'Partial References',
      description: 'Generate objects with ID references only, no nested objects',
      resolve: (cycle, nodes) => {
        const breakPoints: ResolutionPlan['breakPoints'] = [];

        for (let i = 0; i < cycle.nodes.length - 1; i++) {
          const fromName = cycle.nodes[i];
          const toName = cycle.nodes[i + 1];
          if (!fromName || !toName) continue;
          const fromNode = nodes.get(fromName);

          if (fromNode) {
            for (const field of fromNode.model.fields) {
              if (field.type === toName) {
                breakPoints.push({
                  from: fromName,
                  to: toName,
                  field: field.name,
                  action: 'partial'
                });
              }
            }
          }
        }

        return {
          strategy: 'partial-references',
          breakPoints,
          generationOrder: cycle.nodes,
          deferredRelations: []
        };
      }
    });
  }

  // Public method to register custom strategies
  registerStrategy(strategy: CycleResolutionStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  // Get available strategies
  getAvailableStrategies(): string[] {
    return Array.from(this.strategies.keys());
  }

  // Set preferred strategy
  setPreferredStrategy(strategyName: string): void {
    if (!this.strategies.has(strategyName)) {
      throw new Error(`Unknown strategy: ${strategyName}`);
    }
    this.preferredStrategy = strategyName;
  }
}

// Export singleton instance
export const circularDependencyResolver = new CircularDependencyResolver();

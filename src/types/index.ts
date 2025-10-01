// Core types for Mocktail CLI

// Re-export schema parser types for backward compatibility
export type { SchemaField as Field, SchemaModel as Model, SchemaModelsMap as ModelsMap } from '../schema-parsers/baseSchemaParser';

// Legacy types for backward compatibility
export interface LegacyField {
  name: string;
  type: string;
  rawType: string;
  isArray: boolean;
  isOptional: boolean;
  isScalar: boolean;
  isRelation: boolean;
  isId: boolean;
  isUnique: boolean;
  hasDefault: boolean;
  relationFromFields?: string[];
  relationReferences?: string[];
  relationName?: string | undefined;
}

export interface LegacyModel {
  name: string;
  fields: LegacyField[];
  modelLevelUniques: string[][];
}

export interface LegacyModelsMap {
  [modelName: string]: LegacyModel;
}

export interface GenerateOptions {
  count?: number;
  customFields?: Record<string, any>;
  relationData?: Record<string, any[]>;
  config?: {
    sqlMode?: boolean;
    [key: string]: any;
  };
  preset?: string | null;
}

export interface GeneratedData {
  records: Record<string, any>[];
  joinTableRecords: Record<string, Array<{ A: string; B: string }>>;
}

export interface RelationPreset {
  [modelName: string]: {
    [relationName: string]: {
      count?: {
        min: number;
        max: number;
      };
    };
  };
}

export interface RelationPresets {
  blog: RelationPreset;
  ecommerce: RelationPreset;
  social: RelationPreset;
}

export interface MockConfig {
  [modelName: string]: {
    [fieldName: string]: any;
  };
}

export interface SeedData {
  order: string[];
  data: Record<string, Record<string, any>[]>;
}


export interface GenerateCommandOptions {
  count: string;
  out?: string;
  format: string;
  schema: string;
  type?: string;
  models?: string;
  mockConfig?: string;
  depth: string;
  nest?: boolean;
  relations?: boolean;
  dedupe?: boolean;
  pretty?: boolean;
  noPretty?: boolean;
  noLog?: boolean;
  seed?: boolean;
  seedValue?: string;
  preset?: string;
  forceLogo?: boolean;
  batch?: boolean;
}

export interface GlobalOptions {
  logo?: boolean;
  quiet?: boolean;
  forceLogo?: boolean;
}

export interface SpawnOptions {
  cwd: string;
  stdio: 'inherit' | 'pipe';
  shell: boolean;
}

export interface ChildProcess {
  on: (event: string, callback: (code: number) => void) => void;
}

export interface FakerInstance {
  seed: (value: number) => void;
  number: {
    int: (options: { min: number; max: number }) => number;
  };
  [key: string]: any;
}

export interface WriteFileOptions {
  encoding: string;
}

export interface ReadFileOptions {
  encoding: string;
}

export interface FileStats {
  isDirectory: () => boolean;
  isFile: () => boolean;
}

export interface Dirent {
  name: string;
  isDirectory: () => boolean;
  isFile: () => boolean;
}

export interface ProcessEnv {
  [key: string]: string | undefined;
}

// Re-export SchemaValidation separately to avoid conflicts
export type { SchemaValidation } from '../schema-parsers/baseSchemaParser';

export interface Process {
  env: ProcessEnv;
  argv: string[];
  cwd: () => string;
  exit: (code?: number) => never;
}

export interface Console {
  log: (...args: any[]) => void;
  error: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  dir: (obj: any, options?: { depth: number | null }) => void;
}

export interface FsModule {
  existsSync: (path: string) => boolean;
  readFileSync: (path: string, options: ReadFileOptions) => string;
  writeFileSync: (path: string, data: string, options: WriteFileOptions) => void;
  mkdirSync: (path: string, options?: { recursive: boolean }) => void;
  unlinkSync: (path: string) => void;
  readdirSync: (path: string) => string[];
  statSync: (path: string) => FileStats;
}

export interface PathModule {
  join: (...paths: string[]) => string;
  resolve: (...paths: string[]) => string;
  dirname: (path: string) => string;
}

export interface OsModule {
  homedir: () => string;
}

export interface SpawnModule {
  spawn: (command: string, args: string[], options: SpawnOptions) => ChildProcess;
}

export interface CommanderCommand {
  name: (name?: string) => string;
  description: (desc?: string) => string;
  version: (version: string) => CommanderCommand;
  option: (flags: string, description?: string, defaultValue?: any) => CommanderCommand;
  command: (name: string, description?: string) => CommanderCommand;
  action: (fn: (opts: any) => void | Promise<void>) => CommanderCommand;
  parse: (argv: string[]) => void;
  opts: () => any;
  helpInformation: () => string;
  commands: CommanderCommand[];
}

export interface CommanderProgram extends CommanderCommand {
  // Additional methods specific to the main program
}

export interface ChalkInstance {
  hex: (color: string) => ChalkInstance;
  bold: ChalkInstance;
  greenBright: ChalkInstance;
  yellow: ChalkInstance;
  cyan: ChalkInstance;
  magenta: ChalkInstance;
  gray: ChalkInstance;
  underline: ChalkInstance;
  blue: ChalkInstance;
}

export interface OraSpinner {
  start: (text?: string) => void;
  succeed: (text?: string) => void;
  fail: (text?: string) => void;
}

export interface OraModule {
  (options?: { spinner: string }): OraSpinner;
  default: (options?: { spinner: string }) => OraSpinner;
}

export interface NanoidModule {
  customAlphabet: (alphabet: string, size: number) => () => string;
}

export interface GraphQLModule {
  // Add GraphQL types if needed
}

export interface PrismaClientModule {
  PrismaClient: new () => any;
}

export interface DotEnvModule {
  config: (options: { path: string }) => void;
}

interface GenerateOptions {
    schema: string;
    count: number;
    seed: boolean;
    output: string;
}
declare function runGenerate({ schema, count, seed, output }: GenerateOptions): Promise<void>;
export { runGenerate };

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}
// Neon glow effect cycles between two colors
function neonGlow(text, step) {
    const colors = [chalk_1.default.hex('#00ffc8').bold, chalk_1.default.hex('#8e44ad').bold];
    const color = colors[step % colors.length];
    return color?.(text) || text;
}
// Animate cocktail bubbles moving up and down
async function animateCocktailBubbles(cycles = 8) {
    const frames = [
        '     🍸       ',
        '    🍸        ',
        '     🍸       ',
        '      🍸      ',
    ];
    for (let i = 0; i < cycles; i++) {
        process.stdout.write('\r' + chalk_1.default.hex('#00d8c9')(frames[i % frames.length]));
        await sleep(150);
    }
    process.stdout.write('\n');
}
// Typewriter effect for tagline with blinking cursor
async function typeTagline(text) {
    for (let i = 0; i <= text.length; i++) {
        const visible = chalk_1.default.hex('#8e44ad').italic(text.slice(0, i));
        const cursor = i < text.length ? chalk_1.default.hex('#00d8c9')('_') : ' ';
        process.stdout.write('\r' + visible + cursor);
        await sleep(80);
    }
    process.stdout.write('\n\n');
}
async function printMocktailLogo() {
    // Static cat art (purple)
    console.log(chalk_1.default.hex('#8e44ad')('     .   .'));
    console.log(chalk_1.default.hex('#8e44ad')('     |\\_/|'));
    console.log(chalk_1.default.hex('#8e44ad')('    ( o o )'));
    console.log(chalk_1.default.hex('#8e44ad')('     > ^ <'));
    console.log();
    // Cocktail bubbles animation
    await animateCocktailBubbles();
    // Neon glowing banner cycling 10 times
    const banner = [
        ' __  __            _        _       _ ',
        '|  \\/  | ___  _ __| |_ __ _| | ___ | |',
        "| |\\/| |/ _ \\| '__| __/ _` | |/ _ \\| |",
        '| |  | | (_) | |  | || (_| | | (_) |_|',
        '|_|  |_|\\___/|_|   \\__\\__,_|_|\\___/(_)',
    ];
    for (let step = 0; step < 10; step++) {
        process.stdout.write('\x1Bc'); // Clear screen
        // Print cat again
        console.log(chalk_1.default.hex('#8e44ad')('     .   .'));
        console.log(chalk_1.default.hex('#8e44ad')('     |\\_/|'));
        console.log(chalk_1.default.hex('#8e44ad')('    ( o o )'));
        console.log(chalk_1.default.hex('#8e44ad')('     > ^ <'));
        console.log();
        // Cocktail (static)
        console.log(chalk_1.default.hex('#00d8c9')('     🍸'));
        console.log();
        // Banner with neon glow cycling
        for (const line of banner) {
            console.log(neonGlow(line, step));
        }
        await sleep(150);
    }
    // Final full banner (cyan)
    console.log();
    for (const line of banner) {
        console.log(chalk_1.default.cyan.bold(line));
    }
    console.log();
    // Branding
    console.log(chalk_1.default.hex('#00d8c9').bold('      MOCKTAIL') + chalk_1.default.hex('#8e44ad').italic('-CLI'));
    // Tagline typing with blinking cursor
    await typeTagline('Prisma-aware Mock Data Generator CLI');
}
exports.default = printMocktailLogo;

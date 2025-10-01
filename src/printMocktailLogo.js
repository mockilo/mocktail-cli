"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var chalk_1 = require("chalk");
function sleep(ms) {
    return new Promise(function (r) { return setTimeout(r, ms); });
}
// Neon glow effect cycles between two colors
function neonGlow(text, step) {
    var colors = [chalk_1.default.hex('#00ffc8').bold, chalk_1.default.hex('#8e44ad').bold];
    var color = colors[step % colors.length];
    return (color === null || color === void 0 ? void 0 : color(text)) || text;
}
// Animate cocktail bubbles moving up and down
function animateCocktailBubbles() {
    return __awaiter(this, arguments, void 0, function (cycles) {
        var frames, i;
        if (cycles === void 0) { cycles = 8; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    frames = [
                        '     🍸       ',
                        '    🍸        ',
                        '     🍸       ',
                        '      🍸      ',
                    ];
                    i = 0;
                    _a.label = 1;
                case 1:
                    if (!(i < cycles)) return [3 /*break*/, 4];
                    process.stdout.write('\r' + chalk_1.default.hex('#00d8c9')(frames[i % frames.length]));
                    return [4 /*yield*/, sleep(150)];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    i++;
                    return [3 /*break*/, 1];
                case 4:
                    process.stdout.write('\n');
                    return [2 /*return*/];
            }
        });
    });
}
// Typewriter effect for tagline with blinking cursor
function typeTagline(text) {
    return __awaiter(this, void 0, void 0, function () {
        var i, visible, cursor;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    i = 0;
                    _a.label = 1;
                case 1:
                    if (!(i <= text.length)) return [3 /*break*/, 4];
                    visible = chalk_1.default.hex('#8e44ad').italic(text.slice(0, i));
                    cursor = i < text.length ? chalk_1.default.hex('#00d8c9')('_') : ' ';
                    process.stdout.write('\r' + visible + cursor);
                    return [4 /*yield*/, sleep(80)];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    i++;
                    return [3 /*break*/, 1];
                case 4:
                    process.stdout.write('\n\n');
                    return [2 /*return*/];
            }
        });
    });
}
function printMocktailLogo() {
    return __awaiter(this, void 0, void 0, function () {
        var banner, step, _i, banner_1, line, _a, banner_2, line;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    // Static cat art (purple)
                    console.log(chalk_1.default.hex('#8e44ad')('     .   .'));
                    console.log(chalk_1.default.hex('#8e44ad')('     |\\_/|'));
                    console.log(chalk_1.default.hex('#8e44ad')('    ( o o )'));
                    console.log(chalk_1.default.hex('#8e44ad')('     > ^ <'));
                    console.log();
                    // Cocktail bubbles animation
                    return [4 /*yield*/, animateCocktailBubbles()];
                case 1:
                    // Cocktail bubbles animation
                    _b.sent();
                    banner = [
                        ' __  __            _        _       _ ',
                        '|  \\/  | ___  _ __| |_ __ _| | ___ | |',
                        "| |\\/| |/ _ \\| '__| __/ _` | |/ _ \\| |",
                        '| |  | | (_) | |  | || (_| | | (_) |_|',
                        '|_|  |_|\\___/|_|   \\__\\__,_|_|\\___/(_)',
                    ];
                    step = 0;
                    _b.label = 2;
                case 2:
                    if (!(step < 10)) return [3 /*break*/, 5];
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
                    for (_i = 0, banner_1 = banner; _i < banner_1.length; _i++) {
                        line = banner_1[_i];
                        console.log(neonGlow(line, step));
                    }
                    return [4 /*yield*/, sleep(150)];
                case 3:
                    _b.sent();
                    _b.label = 4;
                case 4:
                    step++;
                    return [3 /*break*/, 2];
                case 5:
                    // Final full banner (cyan)
                    console.log();
                    for (_a = 0, banner_2 = banner; _a < banner_2.length; _a++) {
                        line = banner_2[_a];
                        console.log(chalk_1.default.cyan.bold(line));
                    }
                    console.log();
                    // Branding
                    console.log(chalk_1.default.hex('#00d8c9').bold('      MOCKTAIL') + chalk_1.default.hex('#8e44ad').italic('-CLI'));
                    // Tagline typing with blinking cursor
                    return [4 /*yield*/, typeTagline('Prisma-aware Mock Data Generator CLI')];
                case 6:
                    // Tagline typing with blinking cursor
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.default = printMocktailLogo;

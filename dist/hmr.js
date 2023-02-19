"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const chokidar_1 = __importDefault(require("chokidar"));
const buildParentTree = (module, parentChain = []) => {
    const tree = {};
    tree[module.filename] = [...parentChain];
    tree[module.filename].push(module.filename);
    if (module.children.length) {
        module.children.forEach((child) => {
            if (!child.filename.includes("node_modules")) {
                Object.assign(tree, buildParentTree(child, tree[module.filename]));
            }
        });
    }
    return tree;
};
const callChangeHandler = (cb) => {
    try {
        cb();
    }
    catch (err) {
        console.error(err);
    }
};
const handleFileChange = (cb, options, rootModule, cache) => (_, filePath) => {
    const moduleId = path_1.default.resolve(options.watchDir, filePath);
    const tree = buildParentTree(rootModule);
    if (tree[moduleId]) {
        tree[moduleId].forEach((id) => {
            delete cache[id];
        });
        rootModule.children = [];
        if (options.debug) {
            console.info({ modulesToReload: tree[moduleId] });
        }
    }
    callChangeHandler(cb);
};
function hmr(cb, options = {}, rootModule = require.main, cache = require.cache) {
    let { watchFilePatterns } = options;
    if (!watchFilePatterns) {
        watchFilePatterns = ["**/*.ts", "**/*.js"];
    }
    const rootDir = path_1.default.dirname(rootModule.filename);
    if (options.watchDir) {
        options.watchDir = path_1.default.resolve(rootDir, options.watchDir);
    }
    else {
        options.watchDir = rootDir;
    }
    const watcher = chokidar_1.default.watch(watchFilePatterns, Object.assign({ ignoreInitial: true, cwd: options.watchDir, ignored: [".git", "node_modules"] }, options.chokidar));
    watcher.on("all", handleFileChange(cb, options, rootModule, cache));
    callChangeHandler(cb);
}
exports.default = hmr;

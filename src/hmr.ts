import path from "path";
import chockidar from "chokidar";

interface Dict<T> {
  [key: string]: T | undefined;
}

interface ParentModules {
  [key: string]: string[];
}

const buildParentTree = (
  module: NodeModule,
  parentChain: string[] = []
): ParentModules => {
  const tree: ParentModules = {};

  tree[module.filename] = [...parentChain];
  tree[module.filename].push(module.filename);

  if (module.children.length) {
    module.children.forEach((child: NodeModule) => {
      if (!child.filename.includes("node_modules")) {
        Object.assign(tree, buildParentTree(child, tree[module.filename]));
      }
    });
  }

  return tree;
};

const callChangeHandler = (cb: Function) => {
  try {
    cb();
  } catch (err) {
    console.error(err);
  }
};

const handleFileChange =
  (
    cb: Function,
    options: HmrOptions,
    rootModule: NodeModule,
    cache: Dict<NodeModule>
  ) =>
  (_: string, filePath: string) => {
    const moduleId = path.resolve(options.watchDir!, filePath);
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

type HmrOptions = {
  watchFilePatterns?: string[];
  watchDir?: string;
  chokidar?: chockidar.WatchOptions;
  debug?: boolean;
};

export default function hmr(
  cb: Function,
  options: HmrOptions = {},
  rootModule: NodeModule = require.main!,
  cache: Dict<NodeModule> = require.cache
) {
  let { watchFilePatterns } = options;
  if (!watchFilePatterns) {
    watchFilePatterns = ["**/*.ts", "**/*.js"];
  }

  const rootDir = path.dirname(rootModule.filename);

  if (options.watchDir) {
    options.watchDir = path.resolve(rootDir, options.watchDir);
  } else {
    options.watchDir = rootDir;
  }

  const watcher = chockidar.watch(watchFilePatterns, {
    ignoreInitial: true,
    cwd: options.watchDir,
    ignored: [".git", "node_modules"],
    ...options.chokidar,
  });

  watcher.on("all", handleFileChange(cb, options, rootModule, cache));
  callChangeHandler(cb);
}

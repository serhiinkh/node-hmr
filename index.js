const path = require('path');
const chokidar = require('chokidar');

class HMR {
  constructor() {
    this.parentModuleName = module.parent.filename;
    this.requireCache = require.cache;
  }

  getCacheByModuleId(moduleId) {
    return this.requireCache[moduleId];
  }

  deleteModuleFromCache(moduleId) {
    delete this.requireCache[moduleId];
  }

  setupWatcher() {
    return chokidar.watch(this.watchFilePatterns, {
      ignoreInitial: true,
      cwd: this.watchDir,
      ignored: [
        '.git',
        'node_modules',
      ],
      ...this.options.chokidar,
    });
  }

  handleFileChange(_, file) {
    const moduleId = path.resolve(this.watchDir, file);
    let module = this.getCacheByModuleId(moduleId);

    if (!module) {
      module = this.getCacheByModuleId(this.parentModuleName);
    }

    if (module) {
      const modulesToReload = [module.id];
      let parentModule = module.parent;

      while (parentModule && parentModule.id !== '.') {
        modulesToReload.push(parentModule.id);
        parentModule = parentModule.parent;
      }

      modulesToReload.forEach((id) => {
        this.deleteModuleFromCache(id);
      });

      if (this.options.debug) {
        console.info({ modulesToReload });
      }

      this.callChangeHandler();
    }
  }

  init(callback, options = {}) {
    this.callback = callback;
    this.options = options;

    let watchFilePatterns = ["**/*.js"];
    if (options.watchFilePatterns) {
      watchFilePatterns = options.watchFilePatterns;
    }
    this.watchFilePatterns = watchFilePatterns;

    let watchDir = path.dirname(this.parentModuleName);
    if (options.watchDir) {
      watchDir = path.resolve(watchDir, options.watchDir);
    }

    this.watchDir = watchDir;

    const watcher = this.setupWatcher();
    watcher.on('all', this.handleFileChange.bind(this));
    this.callChangeHandler();
  }

  callChangeHandler() {
    try {
      this.callback();
    } catch (err) {
      console.error(err);
    }
  }
}

const instance = new HMR();

module.exports = instance.init.bind(instance);
module.exports.instance = instance;

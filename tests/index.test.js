const hmr = require('..');
const path = require('path');
const chokidar = require('chokidar');

describe('HMR', () => {
  chokidar.watch = jest.fn(() => ({ on: jest.fn() }));
  const mockCallback = jest.fn();

  it('should call callback after first invocation', () => {
    hmr(mockCallback);
    expect(mockCallback).toBeCalledTimes(1);
  });

  it('should handle watcher filechange event', () => {
    const moduleName = 'module-test.js';
    const moduleNameAbsolute = path.resolve(__dirname, moduleName);
    const moduleNameParent = 'module-test-parent.js';
    const moduleNameParentAbsolute = path.resolve(__dirname, moduleNameParent);

    hmr.instance.requireCache = {
      [moduleNameAbsolute]: {
        id: moduleNameAbsolute,
        parent: {
          [moduleNameParentAbsolute]: {
            id: moduleNameParentAbsolute,
          },
        },
      },
    };

    expect(hmr.instance.requireCache).not.toEqual({});
    hmr.instance.handleFileChange(null, moduleName);
    expect(mockCallback).toBeCalledTimes(2);
    expect(hmr.instance.requireCache).toEqual({});

    hmr.instance.handleFileChange(null, moduleName);
    expect(mockCallback).toBeCalledTimes(2);
  });

  it('should handle provided options', () => {
    const watchDir = '../';
    const debug = true;
    const watchDirAbsolute = path.resolve(__dirname, watchDir);
    hmr(mockCallback, { watchDir, debug });

    expect(hmr.instance.options.watchDir).toEqual(watchDir);
    expect(hmr.instance.options.debug).toEqual(debug);
    expect(hmr.instance.watchDir).toEqual(watchDirAbsolute);

    const moduleName = 'module-test.js';
    const moduleNameAbsolute = path.resolve(__dirname, watchDir, moduleName);
    hmr.instance.requireCache = {
      [moduleNameAbsolute]: {
        id: moduleNameAbsolute,
      },
    };

    console.info = jest.fn();
    hmr.instance.handleFileChange(null, moduleName);
    expect(console.info).toBeCalledWith(
      expect.objectContaining({
        modulesToReload: [moduleNameAbsolute],
      }),
    );
  });
});

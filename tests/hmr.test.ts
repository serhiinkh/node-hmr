// @ts-ignore
import { jest, describe, it, expect } from "@jest/globals";
import hmr from "../src";
import path from "path";
import chokidar from "chokidar";

jest.mock("chokidar");

describe("HMR", () => {
  const chokidarWatchMock = jest.mocked(chokidar)
    .watch as jest.MockedFunction<any>;
  it("should setup chokidar with default options and invoke callback after first invocation", () => {
    const mockCallback = jest.fn();
    chokidarWatchMock.mockImplementation(() => ({ on: jest.fn() }));
    hmr(mockCallback);
    expect(mockCallback).toBeCalledTimes(1);
    expect(chokidarWatchMock).toHaveBeenCalledWith(["**/*.ts", "**/*.js"], {
      ignoreInitial: true,
      cwd: __dirname,
      ignored: [".git", "node_modules"],
    });
  });

  it("should setup chokidar with custom options", () => {
    const mockCallback = jest.fn();
    chokidarWatchMock.mockImplementation(() => ({ on: jest.fn() }));
    const watchFilePatterns = ["test"];
    const watchDir = "../";
    hmr(mockCallback, {
      watchDir,
      watchFilePatterns,
      chokidar: { ignoreInitial: false },
    });
    expect(chokidarWatchMock).toHaveBeenCalledWith(watchFilePatterns, {
      ignoreInitial: false,
      cwd: path.resolve(__dirname, watchDir),
      ignored: [".git", "node_modules"],
    });
  });

  it("should handle file change event", () => {
    const mockCallback = jest.fn();
    const mockEventHandler = jest.fn();
    const moduleName1 = path.resolve(__dirname, "root-module.js");
    const moduleName2 = path.resolve(__dirname, "module-test.js");
    const moduleName3 = path.resolve(__dirname, "module-test-child.js");
    const info = jest.spyOn(console, "info").mockImplementation(() => {});
    const fakeRootModule = {
      filename: moduleName1,
      children: [
        {
          filename: moduleName2,
          children: [
            {
              filename: moduleName3,
              children: [],
            },
          ],
        },
      ],
    } as any;
    const childModuleCheck = { ...fakeRootModule.children[0].children[0] };
    const fakeCache = {
      [moduleName1]: fakeRootModule,
      [moduleName2]: fakeRootModule.children[0],
      [moduleName3]: fakeRootModule.children[0].children[0],
    };
    chokidarWatchMock.mockImplementation(() => ({ on: mockEventHandler }));
    hmr(mockCallback, { debug: true }, fakeRootModule, fakeCache);
    const eventHandler: any = mockEventHandler.mock.calls[0][1];
    const moduleName = "module-test.js";
    eventHandler("", moduleName);
    expect(fakeCache).toEqual({ [moduleName3]: childModuleCheck });
    expect(fakeRootModule.children).toEqual([]);
    expect(info).toHaveBeenCalled();
    info.mockRestore();
  });

  it("should handle file change event and skip modules from node_modules folder", () => {
    const mockCallback = jest.fn();
    const mockEventHandler = jest.fn();
    const moduleName1 = path.resolve(__dirname, "root-module.js");
    const moduleName2 = path.resolve(__dirname, "module-test.js");
    const moduleName3 = path.resolve(
      __dirname,
      "../node_modules/test/index.js"
    );
    const fakeRootModule: any = {
      filename: moduleName1,
      children: [
        {
          filename: moduleName2,
          children: [],
        },
        {
          filename: moduleName3,
          children: [],
        },
      ],
    };
    const moduleInNodeModulesDir = { ...fakeRootModule.children[1] };
    const fakeCache = {
      [moduleName1]: fakeRootModule,
      [moduleName2]: fakeRootModule.children[0],
      [moduleName3]: fakeRootModule.children[1],
    };
    chokidarWatchMock.mockImplementation(() => ({ on: mockEventHandler }));
    hmr(mockCallback, {}, fakeRootModule, fakeCache);
    const eventHandler: any = mockEventHandler.mock.calls[0][1];
    const moduleName = "module-test.js";
    eventHandler("", moduleName);
    expect(fakeCache).toEqual({ [moduleName3]: moduleInNodeModulesDir });
  });

  it("should catch callback error", () => {
    const testError = new Error("Test error");
    const mockCallback = jest.fn(() => {
      throw testError;
    });
    const mockEventHandler = jest.fn();
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    chokidarWatchMock.mockImplementation(() => ({ on: mockEventHandler }));
    hmr(mockCallback);
    const eventHandler: any = mockEventHandler.mock.calls[0][1];
    const moduleName = "module-test.js";
    eventHandler("", moduleName);
    expect(error).toHaveBeenCalledWith(testError);
    error.mockRestore();
  });
});

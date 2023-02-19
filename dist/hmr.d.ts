/// <reference types="node" />
import chockidar from "chokidar";
interface Dict<T> {
    [key: string]: T | undefined;
}
type HmrOptions = {
    watchFilePatterns?: string[];
    watchDir?: string;
    chokidar?: chockidar.WatchOptions;
    debug?: boolean;
};
export default function hmr(cb: Function, options?: HmrOptions, rootModule?: NodeModule, cache?: Dict<NodeModule>): void;
export {};

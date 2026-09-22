import { File as NodeFile } from "node:buffer";

Object.assign(globalThis, { File: NodeFile });

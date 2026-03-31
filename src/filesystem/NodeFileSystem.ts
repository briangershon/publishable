import { promises as fs } from "fs";
import type { IFileSystem, IFileStat } from "./IFileSystem.js";

export class NodeFileSystem implements IFileSystem {
  async mkdir(path: string, options: { recursive: boolean }): Promise<void> {
    await fs.mkdir(path, options);
  }

  async access(path: string): Promise<void> {
    await fs.access(path);
  }

  async readFile(path: string, encoding: "utf-8"): Promise<string> {
    return fs.readFile(path, encoding);
  }

  async writeFile(
    path: string,
    content: string,
    encoding: "utf-8",
  ): Promise<void> {
    await fs.writeFile(path, content, encoding);
  }

  async readdir(path: string): Promise<string[]> {
    return fs.readdir(path);
  }

  async stat(path: string): Promise<IFileStat> {
    return fs.stat(path);
  }
}

import type { IFileSystem, IFileStat } from "./IFileSystem.js";

function enoent(syscall: string, path: string): Error {
  return Object.assign(
    new Error(`ENOENT: no such file or directory, ${syscall} '${path}'`),
    { code: "ENOENT" },
  );
}

export class InMemoryFileSystem implements IFileSystem {
  private files = new Map<string, string>();
  private dirs = new Set<string>();

  async mkdir(path: string, options: { recursive: boolean }): Promise<void> {
    if (options.recursive) {
      const parts = path.split("/");
      for (let i = 1; i <= parts.length; i++) {
        const segment = parts.slice(0, i).join("/");
        if (segment) this.dirs.add(segment);
      }
    } else {
      this.dirs.add(path);
    }
  }

  async access(path: string): Promise<void> {
    if (!this.files.has(path) && !this.dirs.has(path)) {
      throw enoent("access", path);
    }
  }

  async readFile(path: string, _encoding: "utf-8"): Promise<string> {
    if (!this.files.has(path)) throw enoent("open", path);
    return this.files.get(path)!;
  }

  async writeFile(
    path: string,
    content: string,
    _encoding: "utf-8",
  ): Promise<void> {
    this.files.set(path, content);
  }

  async readdir(path: string): Promise<string[]> {
    const prefix = path.endsWith("/") ? path : `${path}/`;
    const entries = new Set<string>();
    for (const filePath of this.files.keys()) {
      if (filePath.startsWith(prefix)) {
        entries.add(filePath.slice(prefix.length).split("/")[0]);
      }
    }
    for (const dirPath of this.dirs) {
      if (dirPath.startsWith(prefix)) {
        const rel = dirPath.slice(prefix.length);
        if (!rel.includes("/")) entries.add(rel);
      }
    }
    return [...entries].sort();
  }

  async stat(path: string): Promise<IFileStat> {
    if (this.dirs.has(path)) return { isDirectory: () => true };
    if (this.files.has(path)) return { isDirectory: () => false };
    throw enoent("stat", path);
  }
}

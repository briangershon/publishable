export interface IFileStat {
  isDirectory(): boolean;
}

export interface IFileSystem {
  mkdir(path: string, options: { recursive: boolean }): Promise<void>;
  access(path: string): Promise<void>;
  readFile(path: string, encoding: "utf-8"): Promise<string>;
  writeFile(path: string, content: string, encoding: "utf-8"): Promise<void>;
  readdir(path: string): Promise<string[]>;
  stat(path: string): Promise<IFileStat>;
}

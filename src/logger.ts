/*
  Remoji - Discord emoji manager bot
  Copyright (C) 2021 Shino <shinotheshino@gmail.com>.

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU Affero General Public License as published
  by the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU Affero General Public License for more details.

  You should have received a copy of the GNU Affero General Public License
  along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import * as appRoot from "app-root-path";
import * as szBin from "7zip-bin";
import * as sz from "node-7z";
import * as chalk from "chalk";
import * as fs from "fs";
import { DateTime } from "luxon";
import * as path from "path";
import * as util from "util";

export enum LogLevel {
  VERBOSE,
  INFO,
  WARNING,
  ERROR,
}

const DEFAULT_COLORS = {
  [LogLevel.VERBOSE]: chalk.hsl(280, 45, 60),
  [LogLevel.INFO]: chalk.hsl(0, 0, 60),
  [LogLevel.WARNING]: chalk.hsl(60, 45, 60),
  [LogLevel.ERROR]: chalk.hsl(0, 45, 60),
};

const ERROR_TYPES = {
  [LogLevel.VERBOSE]: "D", // D = Debug
  [LogLevel.INFO]: "I",
  [LogLevel.WARNING]: "W",
  [LogLevel.ERROR]: "E",
};

export interface LoggerOptions {
  colorsHSL?: Record<LogLevel, [h: number, s: number, l: number]>;
  logDir?: string;
}

/**
 * Provides methods for logging messages to stdout/stderr and files, along with 7-zip
 * for regular compression of old log files.
 */
export class Logger {
  readonly colors: Readonly<Record<LogLevel, chalk.Chalk>>;
  readonly dir: string;

  protected static isArchiving = false;

  protected constructor(readonly namespace: string, options?: LoggerOptions) {
    if (options?.colorsHSL) {
      this.colors = Object.fromEntries(
        Object.entries(options.colorsHSL).map(([level, hsl]) => [level, chalk.hsl(...hsl)]),
      ) as Record<LogLevel, chalk.Chalk>;
    } else {
      this.colors = DEFAULT_COLORS;
    }

    if (options?.logDir) {
      this.dir = options.logDir;
    } else {
      this.dir = path.join(appRoot.path, "logs");
    }
  }

  protected static loggers = new Map<string, Logger>();

  /**
   * Fetches (and creates, if needed) a Logger.
   *
   * @param namespace The namespace to get
   * @param creationOptions Options to pass when creating a new Logger
   * @returns The Logger
   */
  public static getLogger(namespace: string, creationOptions?: LoggerOptions): Logger {
    if (this.loggers.has(namespace)) {
      return this.loggers.get(namespace) as Logger;
    } else {
      const logger = new Logger(namespace, creationOptions);
      this.loggers.set(namespace, logger);
      return logger;
    }
  }

  /**
   * Gets the default Logger instance.
   *
   * @returns The default Logger
   */
  public static getDefault(): Logger {
    let namespace: string;
    try {
      namespace = appRoot.require("./package.json").name;
    } catch {
      namespace = "";
    }
    return this.getLogger(namespace || "default");
  }

  /**
   * Logs a message.
   *
   * @param level The level to log at
   * @param content The content to log
   * @param format The format paramters for `content`
   */
  log(level: LogLevel, content: unknown, ...format: unknown[]): void {
    if (typeof content !== "string") content = util.inspect(content);
    const now = DateTime.now().toUTC();

    const timestamp = now.toISO();
    const color = DEFAULT_COLORS[level];
    const type = ERROR_TYPES[level];
    const message = `${type} ${timestamp}: ${util.format(content, ...format)}`;

    process.stdout.write(color(message + "\n"));

    const filename = `${now.toISODate()}.log`;
    fs.mkdirSync(this.dir, { recursive: true });
    fs.appendFileSync(path.join(this.dir, filename), message + "\n");

    // Archive old log files using 7-zip

    const logfiles = fs.readdirSync(this.dir).sort();
    const needArchive = logfiles.filter(file => file.endsWith(".log") && file !== filename);

    if (!Logger.isArchiving && needArchive.length) {
      Logger.isArchiving = true;
      const stream = sz.update(
        path.join(this.dir, "archive.7z"),
        needArchive.map(file => path.join(this.dir, file)),
        {
          $bin: szBin.path7za,
          archiveType: "7z",
          method: ["0=lzma", "x=9", "fb=64", "d=32m", "s=on"],
        },
      );
      stream.on("end", () => {
        for (const file of needArchive) fs.rmSync(path.join(this.dir, file));
        this.log(LogLevel.INFO, `[Logger] Archived ${needArchive.length} log file(s): ${needArchive.join(", ")}`);
        Logger.isArchiving = false;
      });
    }
  }

  /**
   * Log verbosely.
   *
   * @param content - The log message content.
   * @param format - The log format.
   */
  public verbose(content: unknown, ...format: unknown[]): void {
    if (typeof content !== "string") content = util.inspect(content);
    this.log(LogLevel.VERBOSE, content, ...format);
  }

  /**
   * Log infoly.
   *
   * @param content - The log message content.
   * @param format - The log format.
   */
  public info(content: unknown, ...format: unknown[]): void {
    if (typeof content !== "string") content = util.inspect(content);
    this.log(LogLevel.INFO, content, ...format);
  }

  /**
   * Log warnly.
   *
   * @param content - The log message content.
   * @param format - The log format.
   */
  public warn(content: unknown, ...format: unknown[]): void {
    if (typeof content !== "string") content = util.inspect(content);
    this.log(LogLevel.WARNING, content, ...format);
  }

  /**
   * Log errorly.
   *
   * @param content - The log message content.
   * @param format - The log format.
   */
  public error(content: unknown, ...format: unknown[]): void {
    if (typeof content !== "string") content = util.inspect(content);
    this.log(LogLevel.ERROR, content, ...format);
  }
}

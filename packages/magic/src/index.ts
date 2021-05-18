import path from "path";

import chalk from "chalk";

import { getStackTrace, isUrl } from "@startdev/utils";

export interface Magic {
  /** One-line summary of the magic in markdown format. */
  description: string;
  /**
   * If the magic requires care from developers, then this should be a very succint (a few words)
   * summary of the rule developers should follow in markdown format.
   */
  rule?: string;
  /** URL of documentation for the magic or relative path to documentation file in the repo. */
  docs?: string;
  /** The path to the file where the magic was declared. */
  location: string;
}

const registry: Record<string, Magic> = {};

// TODO: Make this a transformer
export type MagicOpts = Pick<Magic, "description" | "rule" | "docs">;
export const declareMagic = ({ description, rule, docs }: MagicOpts): void => {
  if (description in registry) return;

  const callSite = getStackTrace(2)[1];
  const location = callSite.getFileName() || "";

  const obj: { stack: string } = { stack: "" };
  Error.captureStackTrace(obj);
  registry[description] = {
    description,
    location,
    rule,
    docs: docs && (isUrl(docs) ? docs : path.resolve(location, "..", docs)),
  };
};

export const listMagic = (): Magic[] => Object.values(registry);

export const logMagic = (): void => {
  const magic = listMagic();
  console.log(
    chalk.magentaBright("🧙‍ Magic to be aware of:\n") +
      magic
        .map(
          ({ description, rule, docs, location }) =>
            "💫 " +
            (rule ? chalk.bold(chalk.yellow(rule)) + " - " : "") +
            description +
            (chalk.dim("\nSee ") +
              chalk.blueBright(
                docs && isUrl(docs)
                  ? docs
                  : path.relative(process.cwd(), docs || location)
              ))
        )
        .join("\n")
  );
};

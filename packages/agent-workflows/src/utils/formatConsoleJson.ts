import chalk from "chalk";

/**
 * Format JSON with syntax highlighting for console output
 * - Cyan keys
 * - Yellow string values
 * - Green/red boolean values
 * - Left-aligned braces with indented content
 */
export function formatConsoleJson(obj: unknown): string {
  const json = JSON.stringify(obj, null, 2);
  return json
    .split('\n')
    .map((line) => {
      // Handle opening/closing braces - align them left (no extra indent)
      if (line.trim() === '{' || line.trim() === '}') {
        return chalk.dim(line.trim());
      }

      // Color the keys (text before colon)
      const keyMatch = line.match(/^(\s*)"([^"]+)":/);
      if (keyMatch) {
        const key = keyMatch[2];
        const rest = line.substring(keyMatch[0].length);

        // Color values differently based on type
        let coloredRest = rest;
        if (rest.includes('true') || rest.includes('false')) {
          coloredRest = rest.replace(/true|false/g, (m) =>
            m === 'true' ? chalk.green(m) : chalk.red(m)
          );
        } else if (rest.match(/"[^"]*"/)) {
          coloredRest = rest.replace(/"([^"]*)"/g, (_, str) => chalk.yellow(`"${str}"`));
        }

        // Add consistent indentation for content (6 spaces)
        return `      ${chalk.cyan(key)}: ${coloredRest}`;
      }

      return '  ' + chalk.dim(line);
    })
    .join('\n');
}

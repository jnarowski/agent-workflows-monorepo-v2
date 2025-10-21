import boxen, { type Options as BoxenOptions } from "boxen";

export interface RenderBoxOptions {
  /**
   * Box title to display at the top
   */
  title?: string;

  /**
   * Title alignment: 'left' | 'center' | 'right'
   * @default 'center'
   */
  titleAlignment?: 'left' | 'center' | 'right';

  /**
   * Padding inside the box (top, right, bottom, left)
   * @default 1
   */
  padding?: number | { top?: number; right?: number; bottom?: number; left?: number };

  /**
   * Margin outside the box (top, right, bottom, left)
   * @default 1
   */
  margin?: number | { top?: number; right?: number; bottom?: number; left?: number };

  /**
   * Border style
   * @default 'round'
   */
  borderStyle?: BoxenOptions['borderStyle'];

  /**
   * Border color (chalk color name or hex)
   * @default 'cyan'
   */
  borderColor?: string;

  /**
   * Box width (number or 'auto' for full terminal width)
   * @default 'auto'
   */
  width?: number | 'auto';

  /**
   * Minimum width when using 'auto'
   * @default 60
   */
  minWidth?: number;

  /**
   * Text alignment within the box: 'left' | 'center' | 'right'
   * @default 'left'
   */
  textAlignment?: BoxenOptions['textAlignment'];

  /**
   * Float the box: 'left' | 'right' | 'center'
   */
  float?: BoxenOptions['float'];

  /**
   * Whether to use full width of terminal (minus margin)
   * @default true
   */
  fullWidth?: boolean;
}

/**
 * Render content in a formatted console box with configurable styling
 */
export function renderConsoleBox(
  content: string,
  options: RenderBoxOptions = {}
): string {
  const {
    title,
    titleAlignment = 'center',
    padding = 1,
    margin = 1,
    borderStyle = 'round',
    borderColor = 'cyan',
    width = 'auto',
    minWidth = 60,
    textAlignment = 'left',
    float,
    fullWidth = true,
  } = options;

  // Calculate box width
  let boxWidth: number | undefined;
  if (width === 'auto' && fullWidth) {
    const terminalWidth = process.stdout.columns || 80;
    const marginWidth = typeof margin === 'number' ? margin * 2 : (margin.left ?? 0) + (margin.right ?? 0);
    boxWidth = Math.max(terminalWidth - marginWidth - 4, minWidth);
  } else if (typeof width === 'number') {
    boxWidth = width;
  }

  const boxenOptions: BoxenOptions = {
    title,
    titleAlignment,
    padding,
    margin,
    borderStyle,
    borderColor,
    textAlignment,
    ...(boxWidth && { width: boxWidth }),
    ...(float && { float }),
  };

  return boxen(content, boxenOptions);
}

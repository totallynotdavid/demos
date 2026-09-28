/**
 * Centralized Design System Tokens
 * All spacing, sizing, typography, and color configurations
 */

export const spacing = {
  // Gap between inline elements (buttons, inputs in a row)
  inline: "gap-3",

  // Vertical spacing between form groups
  form: "space-y-6",

  // Spacing between sections within a component
  section: "space-y-8",

  // Spacing between major sections/components
  major: "space-y-12",

  // Spacing between large page sections
  page: "space-y-16",

  // Grid gaps
  gridTight: "gap-2",
  gridMedium: "gap-4",
  gridWide: "gap-8",
  gridWideX: "gap-x-8",
  gridWideY: "gap-y-4",

  // Result item spacing
  result: "space-y-3",
  resultList: "space-y-8",
} as const;

export const sizing = {
  // Input/Button heights
  input: "h-11",
  button: "h-11",
  select: "h-11",

  // Button widths
  buttonNormal: "px-8",
  buttonWide: "px-6",
  buttonSelect: "w-40",

  // Progress bar
  progressHeight: "h-1",

  // Chart heights
  chartSmall: 200,
  chartMedium: 300,
} as const;

export const typography = {
  // Text sizes
  textBase: "text-base",
  textSm: "text-sm",
  textXs: "text-xs",

  // Headings
  h1: "text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight",
  h2: "text-3xl font-light tabular-nums",
  h3: "text-sm font-medium",

  // Special text
  subtitle:
    "text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto font-light",
  label: "text-xs text-muted-foreground",

  // Code/monospace
  mono: "text-xs font-mono",
} as const;

export const colors = {
  // Foreground colors
  primary: "text-foreground",
  secondary: "text-muted-foreground",
  destructive: "text-destructive",

  // Background colors
  bgPrimary: "bg-foreground",
  bgMuted: "bg-muted",
  bgMutedLight: "bg-muted/30",
  bgCard: "bg-card/50",

  // Border colors
  border: "border-border/50",
  borderLight: "border-border/40",

  // Special backgrounds
  highlightBg: "bg-foreground/10",
  progressBar: "bg-foreground",
} as const;

export const effects = {
  // Backdrop effects
  backdropBlur: "backdrop-blur-sm",
  backdropBlurStrong: "backdrop-blur-xl",

  // Borders
  border: "border",
  borderBottom: "border-b",
  borderTop: "border-t",
  borderLeft: "border-l-2",

  // Rounded corners
  rounded: "rounded-2xl",
  roundedMd: "rounded",
  roundedFull: "rounded-full",

  // Shadows
  shadow: "shadow-sm",

  // Transitions
  transition: "transition-all",
  transitionColors: "transition-colors",
  transitionWidth: "transition-all duration-300",
} as const;

export const layout = {
  // Container
  container: "max-w-5xl w-full mx-auto",
  containerPadding: "px-4 sm:px-6 lg:px-8",

  // Flex utilities
  flexRow: "flex items-center",
  flexCol: "flex flex-col",
  flexBetween: "flex items-center justify-between",
  flexCenter: "flex items-center justify-center",

  // Grid utilities
  grid2Col: "grid grid-cols-2",
  grid4Col: "grid grid-cols-4",

  // Card-like containers
  card: "bg-card/50 backdrop-blur-sm rounded-2xl border border-border/40 shadow-sm",

  // Page structure
  pageHeight: "min-h-screen",
  pageLayout: "min-h-screen flex flex-col",
} as const;

export const states = {
  // Interactive states
  hover: "hover:text-foreground",
  hoverUnderline: "hover:underline",

  // Disabled
  disabled: "disabled:opacity-50 disabled:cursor-not-allowed",
} as const;

/**
 * Helper to combine design tokens
 */
export function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

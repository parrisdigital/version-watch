/**
 * Hero-shader palettes — resolved in RGB so they upload directly to WebGL.
 *
 * Both modes are colored, but the vocabulary differs:
 *
 *  - DARK mode: deep cobalt → violet → coral highlight (mouse-driven).
 *    Reads as a rich, premium "data terminal" gradient against a charcoal
 *    canvas. The coral acts as the pointer spotlight — warm focal point
 *    against cool field.
 *
 *  - LIGHT mode: sky-blue → lavender → peach highlight on near-white.
 *    Visible without being noisy; the tints are pastel but the density
 *    is raised so the gradient actually shows on a white page.
 */

export type ShaderPalette = {
  canvas: [number, number, number];
  tintA: [number, number, number];
  tintB: [number, number, number];
  tintC: [number, number, number];
  density: number;
};

export const DARK_SHADER_PALETTE: ShaderPalette = {
  canvas: [0.068, 0.072, 0.086],
  tintA: [0.22, 0.33, 0.68],   // deep cobalt
  tintB: [0.48, 0.4, 0.82],    // violet
  tintC: [0.98, 0.58, 0.58],   // coral — mouse spotlight
  density: 0.72,
};

export const LIGHT_SHADER_PALETTE: ShaderPalette = {
  canvas: [0.99, 0.992, 0.995],
  tintA: [0.58, 0.75, 0.98],   // sky blue
  tintB: [0.8, 0.7, 0.98],     // lavender
  tintC: [0.99, 0.78, 0.74],   // soft peach
  density: 0.82,
};

export function readShaderPalette(): ShaderPalette {
  if (typeof document === "undefined") return LIGHT_SHADER_PALETTE;
  return document.documentElement.classList.contains("dark")
    ? DARK_SHADER_PALETTE
    : LIGHT_SHADER_PALETTE;
}

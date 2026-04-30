/**
 * Color utilities for SEIRD state visualization.
 * Green (susceptible) → Yellow (exposed) → Red (infected) → Blue (recovered) → Black (dead)
 */

const SEIRD_COLORS = {
  S: [34, 197, 94],    // green
  E: [245, 158, 11],   // amber
  I: [239, 68, 68],    // red
  R: [59, 130, 246],   // blue
  D: [255, 255, 255],  // white
};

/**
 * Compute a blended color for a node based on its SEIRD probability distribution.
 * Returns an rgb string.
 */
export function getNodeColor(dayState) {
  if (!dayState) return 'rgb(100,100,120)';

  const { S = 0, E = 0, I = 0, R = 0, D = 0 } = dayState;

  // If dead > 0.5, return white
  if (D > 0.5) return `rgb(255, 255, 255)`;

  // Weighted blend
  const r = S * SEIRD_COLORS.S[0] + E * SEIRD_COLORS.E[0] + I * SEIRD_COLORS.I[0] + R * SEIRD_COLORS.R[0] + D * SEIRD_COLORS.D[0];
  const g = S * SEIRD_COLORS.S[1] + E * SEIRD_COLORS.E[1] + I * SEIRD_COLORS.I[1] + R * SEIRD_COLORS.R[1] + D * SEIRD_COLORS.D[1];
  const b = S * SEIRD_COLORS.S[2] + E * SEIRD_COLORS.E[2] + I * SEIRD_COLORS.I[2] + R * SEIRD_COLORS.R[2] + D * SEIRD_COLORS.D[2];

  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

/**
 * Compute a hex color for a node (for Leaflet markers etc.)
 */
export function getNodeColorHex(dayState) {
  if (!dayState) return '#64648c';
  const { S = 0, E = 0, I = 0, R = 0, D = 0 } = dayState;
  if (D > 0.5) return '#ffffff';

  const r = Math.round(S * SEIRD_COLORS.S[0] + E * SEIRD_COLORS.E[0] + I * SEIRD_COLORS.I[0] + R * SEIRD_COLORS.R[0] + D * SEIRD_COLORS.D[0]);
  const g = Math.round(S * SEIRD_COLORS.S[1] + E * SEIRD_COLORS.E[1] + I * SEIRD_COLORS.I[1] + R * SEIRD_COLORS.R[1] + D * SEIRD_COLORS.D[1]);
  const b = Math.round(S * SEIRD_COLORS.S[2] + E * SEIRD_COLORS.E[2] + I * SEIRD_COLORS.I[2] + R * SEIRD_COLORS.R[2] + D * SEIRD_COLORS.D[2]);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Get severity color for heatmap (green → yellow → red).
 * value: 0 (no infection) → 1 (max infection)
 */
export function getSeverityColor(value, alpha = 0.6) {
  const v = Math.max(0, Math.min(1, value));
  let r, g, b;
  if (v < 0.5) {
    // green → yellow
    const t = v * 2;
    r = Math.round(34 + t * (245 - 34));
    g = Math.round(197 + t * (158 - 197));
    b = Math.round(94 + t * (11 - 94));
  } else {
    // yellow → red
    const t = (v - 0.5) * 2;
    r = Math.round(245 + t * (220 - 245));
    g = Math.round(158 - t * 158);
    b = Math.round(11 - t * 11);
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const STATE_LABELS = ['S', 'E', 'I', 'R', 'D'];
export const STATE_NAMES = {
  S: 'Susceptible', E: 'Exposed', I: 'Infected', R: 'Recovered', D: 'Dead'
};
export const STATE_HEX = {
  S: '#22c55e', E: '#f59e0b', I: '#ef4444', R: '#3b82f6', D: '#ffffff'
};

import type { Modifier } from "@dnd-kit/core";

// Sürüklenen satır yalnızca dikeyde hareket etsin (@dnd-kit/modifiers'a gerek kalmadan)
export const restrictToVerticalAxis: Modifier = ({ transform }) => ({ ...transform, x: 0 });

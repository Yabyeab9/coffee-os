// themes/index.ts

import { demoTheme } from "./demo";
import { roastedOriginTheme } from "./roasted-origin";

export const themes = {
    demo: demoTheme,
    roastedOrigin: roastedOriginTheme,
} as const;

export type ThemeName = keyof typeof themes;

export const getTheme = (name: ThemeName) => themes[name];
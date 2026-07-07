import type { Theme } from "@/design-system/theme";

export const roastedOriginTheme: Theme = {
    metadata: {
        name: "Roasted Origin",

        description:
            "A warm premium theme inspired by specialty coffee.",

        version: "1.0.0",

        author: "Coffee OS",

        supportsDarkMode: true,
    },

    colors: {
        brand: {
            primary: "#5C3A21",

            secondary: "#D6C2A8",

            accent: "#7A8B5A",
        },

        background: {
            default: "#FAF8F5",

            surface: "#FFFFFF",

            elevated: "#F3EFEA",
        },

        text: {
            primary: "#1F1F1F",

            secondary: "#5A5A5A",

            inverse: "#FFFFFF",
        },

        border: {
            default: "#E8E2DA",

            subtle: "#F2EEE8",
        },

        feedback: {
            success: "#2E7D32",

            warning: "#ED6C02",

            error: "#D32F2F",

            info: "#1976D2",
        },
    },
};
import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                // Organic/Forest Design System
                forest: "#2C3E2D",       // Primary dark green
                cream: "#F9F6F0",         // Background
                terracotta: "#D76F4B",    // Accent/alerts
                softGreen: "#E8EFE8",     // Secondary backgrounds
                border: "#EBE6DC",        // Borders and shadows
                teal: "#4CA1AF",          // Gradient end color
                textSub: "#888899",       // Secondary text
                
                // Legacy colors (for gradual migration)
                primary: "#4A90E2",
                mint: "#6FD7A8",
                background: "#F6F7F8",
            },
            fontFamily: {
                dmSerif: ['"DM Serif Display"', 'serif'],
                karla: ['Karla', 'sans-serif'],
            },
            borderRadius: {
                card: '24px',
                btn: '12px',
            },
            boxShadow: {
                'organic': '0 10px 25px -5px rgba(44, 62, 45, 0.1)',
                'organic-lg': '0 20px 40px rgba(44, 62, 45, 0.08)',
                'tactile': '0 4px 0 #EBE6DC',
                'active': '0 4px 15px rgba(44, 62, 45, 0.4)',
            },
            backgroundImage: {
                'gradient-forest': 'linear-gradient(135deg, #2C3E2D 0%, #4CA1AF 100%)',
                'gradient-ai': 'linear-gradient(90deg, #FF9A9E 0%, #FECFEF 99%)',
            },
        },
    },
    plugins: [],
};
export default config;

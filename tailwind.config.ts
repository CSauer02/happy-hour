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
        brand: {
          purple: "#750787",
          "purple-light": "#8a2be2",
          "purple-dark": "#42105e",
          pink: "#e91e8c",
          blue: "#4a90d9",
          yellow: "#ffde59",
        },
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #e91e8c 0%, #750787 50%, #4a90d9 100%)",
        "brand-gradient-subtle": "linear-gradient(135deg, rgba(233,30,140,0.1) 0%, rgba(117,7,135,0.1) 50%, rgba(74,144,217,0.1) 100%)",
      },
    },
  },
  plugins: [],
};

export default config;

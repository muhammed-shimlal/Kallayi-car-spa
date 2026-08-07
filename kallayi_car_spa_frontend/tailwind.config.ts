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
        'spa-ice': '#cfe0e8',
        'spa-powder': '#b7d7e8',
        'spa-sky': '#87bdd8',
        'spa-mint': '#daebe8',
      },
    },
  },
  plugins: [],
};

export default config;

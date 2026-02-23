/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        smk_primary: {
          DEFAULT: "#0A2A5A", // Deep Blue
          light: "#1A4A8A",
          dark: "#051A3A",
        },
        smk_secondary: {
          DEFAULT: "#28A745", // Vibrant Green
          light: "#34D399",
          dark: "#1F8F37",
        },
        smk_accent: {
          DEFAULT: "#FFC107", // Gold/Yellow
          light: "#FFD54F",
          dark: "#FFA000",
        },
        smk_neutral: {
          50: "#F8F9FA",
          100: "#E9ECEF",
          200: "#DEE2E6",
          300: "#CED4DA",
          400: "#ADB5BD",
          500: "#6C757D",
          600: "#495057",
          700: "#343A40",
          800: "#212529",
          900: "#121417",
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'sans-serif'],
        display: ['"Poppins"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

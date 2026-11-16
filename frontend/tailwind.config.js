/** Colours come from CSS variables (see src/index.css) so light and dark
 *  themes share the same class names: bg-surface, text-ink, border-line ... */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        page: v("page"),
        surface: v("surface"),
        sunken: v("sunken"),
        ink: v("ink"),
        muted: v("muted"),
        line: v("line"),
        accent: v("accent"),
        "accent-ink": v("accent-ink"),
        good: v("good"),
        soft: v("soft"),
      },
      fontFamily: {
        sans: ['"Instrument Sans"', "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};

import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);
export const useTheme = () => useContext(ThemeContext);

// Chart colours per theme (checked for colour-blind separation and contrast).
const CHART = {
  light: { actual: "#2F5BEA", planned: "#C4701A", grid: "#DBE0E8", text: "#586375", surface: "#FFFFFF" },
  dark: { actual: "#5B7BF0", planned: "#BF7A2C", grid: "#293246", text: "#96A1B4", surface: "#161C29" },
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() =>
    document.documentElement.classList.contains("dark") ? "dark" : "light"
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem("mgt-theme", theme);
    } catch {}
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle, chart: CHART[theme] }}>
      {children}
    </ThemeContext.Provider>
  );
}

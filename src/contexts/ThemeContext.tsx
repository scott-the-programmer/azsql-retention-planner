import { useEffect } from "preact/hooks";

export function ThemeProvider({ children }: { children: any }) {
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
  }, []);

  return <>{children}</>;
}
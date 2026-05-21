import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setDark(isDark);
  }, []);

  function toggle(v: boolean) {
    setDark(v);
    if (v) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }

  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Sun className="h-4 w-4" />
      <Switch checked={dark} onCheckedChange={toggle} aria-label="Toggle dark mode" />
      <Moon className="h-4 w-4" />
    </div>
  );
}
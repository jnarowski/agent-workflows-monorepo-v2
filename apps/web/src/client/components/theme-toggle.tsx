import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { DropdownMenuItem } from "@/client/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("system");
    } else {
      setTheme("light");
    }
  };

  const getIcon = () => {
    if (theme === "dark") return <Moon className="h-4 w-4" />;
    if (theme === "light") return <Sun className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };

  const getLabel = () => {
    if (theme === "dark") return "Dark mode";
    if (theme === "light") return "Light mode";
    return "System theme";
  };

  return (
    <DropdownMenuItem onClick={cycleTheme}>
      {getIcon()}
      {getLabel()}
    </DropdownMenuItem>
  );
}

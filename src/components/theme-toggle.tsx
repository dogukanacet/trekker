"use client";

import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const tooltipRenderContent = (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      <Sun className="h-4 w-4 dark:hidden" />
      <Moon className="h-4 w-4 hidden dark:block" />
    </Button>
  );

  return (
    <Tooltip>
      <TooltipProvider>
        <TooltipTrigger render={tooltipRenderContent} />
        <TooltipContent>
          <p>{theme === "dark" ? "Light Mode" : "Dark Mode"}</p>
        </TooltipContent>
      </TooltipProvider>
    </Tooltip>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Sparkles, Settings, History, Home, BookOpen, ChevronDown, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function Navigation() {
  const pathname = usePathname();
  const [tutorialOpen, setTutorialOpen] = useState(false);

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/wizard", label: "Wizard", icon: Sparkles },
    { href: "/batch", label: "Batch", icon: FileSpreadsheet },
    { href: "/history", label: "History", icon: History },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  const isTutorialActive = pathname?.startsWith("/tutorial");

  const tutorialLinks = [
    { href: "/tutorial", label: "Complete Tutorial" },
    { href: "/tutorial/openrouter", label: "OpenRouter Guide" },
  ];

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Sparkles className="h-6 w-6" />
            <span className="font-bold text-lg">Cataloging Assistant</span>
          </Link>
          <div className="flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "gap-2",
                      isActive && "bg-primary text-primary-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}

            <Popover open={tutorialOpen} onOpenChange={setTutorialOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={isTutorialActive ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "gap-1",
                    isTutorialActive && "bg-primary text-primary-foreground"
                  )}
                >
                  <BookOpen className="h-4 w-4" />
                  Tutorial
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-1" align="end">
                {tutorialLinks.map((link) => (
                  <Link key={link.href} href={link.href} onClick={() => setTutorialOpen(false)}>
                    <div
                      className={cn(
                        "rounded-sm px-3 py-2 text-sm cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground",
                        pathname === link.href && "bg-accent text-accent-foreground font-medium"
                      )}
                    >
                      {link.label}
                    </div>
                  </Link>
                ))}
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </nav>
  );
}

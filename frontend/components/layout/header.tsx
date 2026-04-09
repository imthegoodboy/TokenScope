"use client";

import { UserButton } from "@clerk/nextjs";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function Header({ title, description, action }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 bg-bg/90 backdrop-blur-md border-b border-black-border px-8 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-black">{title}</h1>
          {description && (
            <p className="text-xs text-black-soft mt-0.5">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {action}
          <Button variant="ghost" size="icon" className="relative text-black-soft hover:text-black hover:bg-black/4">
            <Bell size={16} />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-jaffa rounded-full" />
          </Button>
          <div className="ml-1">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8",
                },
              }}
            />
          </div>
        </div>
      </div>
    </header>
  );
}

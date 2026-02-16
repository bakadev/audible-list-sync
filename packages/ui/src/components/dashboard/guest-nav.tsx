"use client";

import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogIn, User } from "lucide-react";
import { ThemeSwitcherMenu } from "@/components/theme-switcher-menu";

export function GuestNav() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring rounded-full">
          <Avatar className="cursor-pointer">
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <ThemeSwitcherMenu />
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/signin" className="cursor-pointer">
            <LogIn className="mr-2 h-4 w-4" />
            Sign In
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

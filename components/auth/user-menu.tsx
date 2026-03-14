"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { SignOut, User, CaretUpDown } from "@phosphor-icons/react";
import { useAuth } from "@workos-inc/authkit-nextjs/components";

function getInitials(name?: string | null): string {
  if (!name) return "U";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function UserMenu() {
  const { user, loading, signOut } = useAuth();

  if (loading || !user) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5">
        <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
        <div className="flex-1 space-y-1">
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
          <div className="h-2 w-28 animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto w-full justify-start gap-2 px-2 py-1.5"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={user.profilePictureUrl ?? undefined}
              alt={user.firstName ?? "User"}
            />
            <AvatarFallback className="text-[10px] font-medium">
              {getInitials(
                user.firstName
                  ? `${user.firstName} ${user.lastName ?? ""}`
                  : user.email,
              )}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col items-start text-left">
            <span className="text-xs font-medium leading-none">
              {user.firstName
                ? `${user.firstName} ${user.lastName ?? ""}`.trim()
                : "User"}
            </span>
            <span className="text-[10px] text-muted-foreground leading-none mt-0.5">
              {user.email}
            </span>
          </div>
          <CaretUpDown size={14} className="shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user.firstName
                ? `${user.firstName} ${user.lastName ?? ""}`.trim()
                : "User"}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <User size={14} />
          Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut({ returnTo: "/" })}
          className="text-destructive focus:text-destructive"
        >
          <SignOut size={14} />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


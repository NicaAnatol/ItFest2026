"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Heartbeat, SignIn, UserPlus } from "@phosphor-icons/react";

interface SignInPageProps {
  signInUrl: string;
  signUpUrl: string;
}

export function SignInPage({ signInUrl, signUpUrl }: SignInPageProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="flex w-full max-w-md flex-col items-center gap-8">
        {/* Logo / Brand */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <Heartbeat size={32} weight="bold" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">MedGraph AI</h1>
            <p className="text-sm text-muted-foreground">
              Hospital Intelligence Platform
            </p>
          </div>
        </div>

        {/* Sign-in card */}
        <Card className="w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-lg">Welcome back</CardTitle>
            <CardDescription>
              Sign in to access the clinical decision platform
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button asChild size="lg" className="w-full">
              <a href={signInUrl}>
                <SignIn size={18} weight="bold" />
                Sign In
              </a>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full">
              <a href={signUpUrl}>
                <UserPlus size={18} />
                Create Account
              </a>
            </Button>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

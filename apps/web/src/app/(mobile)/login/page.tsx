"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { UserLoginSchema, UserLoginInput } from "@vending/validation";
import { useAuthStore } from "@/store/useAuthStore";
import { api } from "@/lib/api";
import defaultThemeConfig from "@/config/theme";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sparkles,
  Lock,
  Mail,
  ArrowRight,
  Loader2,
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/dashboard";
  const { setAuth } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserLoginInput>({
    resolver: zodResolver(UserLoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: UserLoginInput) => {
      const response = await api.post("/auth/login", credentials);
      return response.data;
    },
    onSuccess: (data) => {
      setAuth(data.user, data.token);
      toast.success(`Welcome back, ${data.user.name}!`);
      router.push(redirectTarget);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || "Invalid email or password";
      toast.error(msg);
    },
  });

  const onSubmit = (data: UserLoginInput) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-[700px] flex flex-col justify-between p-6 sm:p-8">
      {/* Top Header & Logo */}
      <div className="space-y-6 pt-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/30">
            <Sparkles className="h-6 w-6 text-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-foreground">
              {defaultThemeConfig.appName}
            </h1>
            <p className="text-xs text-muted-foreground font-medium">
              Vending Fleet & Restock Telemetry
            </p>
          </div>
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-black tracking-tight text-foreground">
            Sign In
          </h2>
          <p className="text-xs text-muted-foreground">
            {redirectTarget !== "/dashboard"
              ? "Technician sign in required to access this machine."
              : "Enter your credentials to access your routes and machines."}
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Email</span>
            </label>
            <Input
              type="email"
              placeholder="name@company.com"
              autoComplete="email"
              className="h-12 rounded-2xl bg-slate-100 dark:bg-zinc-800/80 border-transparent focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary text-sm px-4 shadow-xs"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive font-medium">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Password</span>
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              className="h-12 rounded-2xl bg-slate-100 dark:bg-zinc-800/80 border-transparent focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary text-sm px-4 shadow-xs"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-destructive font-medium">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Full-width Solid Dark Action Button */}
          <Button
            type="submit"
            className="w-full h-12 rounded-2xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 font-bold text-sm shadow-md active:scale-[0.97] transition-transform duration-150 gap-2 mt-4"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <span>Sign In to Portal</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Production Footer */}
      <div className="pt-8 pb-4 text-center">
        <p className="text-[11px] text-muted-foreground">
          Protected Enterprise System • Bee Novelty Vending
        </p>
      </div>
    </div>
  );
}

export default function MobileLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full min-h-[500px] flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

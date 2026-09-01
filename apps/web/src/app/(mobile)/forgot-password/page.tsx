"use client";

import React, { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, ArrowLeft, Send, CheckCircle2, Loader2, Sparkles } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your registered email address or phone");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSent(true);
      toast.success("Password reset instructions sent to your email!");
    }, 600);
  };

  return (
    <div className="min-h-[800px] flex flex-col justify-between p-6 sm:p-8">
      <div className="space-y-6 pt-8">
        {/* Back Link */}
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to login</span>
        </Link>

        {/* Header */}
        <div className="space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/15 text-secondary shadow-xs">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            Forgot Password
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Enter your work email address or phone number and we’ll send you a link to reset your password.
          </p>
        </div>

        {!isSent ? (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Email or Phone</span>
              </label>
              <Input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-2xl bg-slate-100 dark:bg-zinc-800/80 border-transparent focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary text-sm px-4 shadow-xs"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-2xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 font-bold text-sm shadow-md active:scale-[0.97] transition-transform duration-150 gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <span>Send Reset Link</span>
                  <Send className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        ) : (
          <div className="p-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-center space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 mx-auto">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-sm text-foreground">Reset Link Sent</h3>
            <p className="text-xs text-muted-foreground">
              We have dispatched a verification link to <strong>{email}</strong>. Check your inbox and follow the steps.
            </p>
            <Button
              variant="outline"
              onClick={() => setIsSent(false)}
              className="h-9 rounded-xl text-xs font-semibold"
            >
              Try another email
            </Button>
          </div>
        )}
      </div>

      <div className="pb-4 text-center">
        <Link
          href="/login"
          className="text-xs font-bold text-primary hover:underline"
        >
          Remember your password? Sign in
        </Link>
      </div>
    </div>
  );
}

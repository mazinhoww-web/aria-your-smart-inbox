import { motion } from "framer-motion";
import { InboxDemo } from "@/components/landing/InboxDemo";
import { lovable } from "@/integrations/lovable/index";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function LandingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("gmail_connected")
          .eq("id", session.user.id)
          .single();
        navigate("/inbox");
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        navigate("/inbox");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (error) {
      console.error("Google sign-in error:", error);
      setLoading(false);
    }
  };
  return (
    <div className="grain min-h-screen bg-background flex flex-col">
      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-20 px-6 py-12 lg:py-0 max-w-7xl mx-auto w-full">
        {/* Left — Inbox Demo (60%) */}
        <motion.div
          className="w-full lg:w-[58%] flex justify-center"
          initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <InboxDemo />
        </motion.div>

        {/* Right — Hero + CTA (40%) */}
        <motion.div
          className="w-full lg:w-[42%] flex flex-col items-center lg:items-start text-center lg:text-left"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Logo */}
          <h1 className="font-display text-6xl lg:text-7xl tracking-tight text-foreground leading-[0.9]">
            ARIA
          </h1>

          {/* Divider */}
          <div className="w-48 h-px bg-border my-6" />

          {/* Tagline */}
          <h2 className="font-display text-2xl lg:text-3xl text-foreground leading-tight">
            Your inbox,<br />
            finally under<br />
            control.
          </h2>

          {/* Divider */}
          <div className="w-48 h-px bg-border my-6" />

          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
            AI that reads, sorts,<br />
            and drafts. You just<br />
            review and send.
          </p>

          {/* CTA */}
          <motion.button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="mt-10 inline-flex items-center gap-3 px-6 py-3 rounded-lg bg-foreground text-background font-mono text-sm font-medium transition-all hover:shadow-lg hover:shadow-primary/10 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {loading ? "Conectando..." : "Continue com Google"}
          </motion.button>

          {/* Footer note */}
          <p className="mt-6 text-[11px] text-muted-foreground/60 font-label">
            Seus dados ficam criptografados e nunca são compartilhados.
          </p>
        </motion.div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border-subtle px-6 py-4 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground/40 font-label">ARIA v1.0</span>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-cat-notification animate-pulse-glow" />
          <span className="text-[11px] text-muted-foreground/40 font-label">Systems operational</span>
        </div>
      </div>
    </div>
  );
}

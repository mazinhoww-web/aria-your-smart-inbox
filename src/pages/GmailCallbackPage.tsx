import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function GmailCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const errorParam = params.get("error");

      if (errorParam) {
        setError(`Google negou o acesso: ${errorParam}`);
        setTimeout(() => navigate("/onboarding"), 3000);
        return;
      }

      if (!code) {
        setError("Código de autorização não encontrado.");
        setTimeout(() => navigate("/onboarding"), 3000);
        return;
      }

      try {
        const res = await supabase.functions.invoke("exchange-google-token", {
          body: {
            code,
            redirect_uri: `${window.location.origin}/auth/gmail-callback`,
          },
        });

        if (res.error) throw new Error(res.error.message);
        if (res.data?.error) throw new Error(res.data.error);

        // Success — go back to onboarding step 2
        navigate("/onboarding");
      } catch (err) {
        setError((err as Error).message);
        setTimeout(() => navigate("/onboarding"), 4000);
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="grain min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        {error ? (
          <>
            <p className="text-sm text-destructive">{error}</p>
            <p className="text-xs text-muted-foreground">Redirecionando...</p>
          </>
        ) : (
          <>
            <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" />
            <p className="text-sm text-foreground">Conectando ao Gmail...</p>
            <p className="text-xs text-muted-foreground">Salvando credenciais de forma segura</p>
          </>
        )}
      </div>
    </div>
  );
}

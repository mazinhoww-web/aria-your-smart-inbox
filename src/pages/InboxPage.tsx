import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppSidebar } from "@/components/inbox/AppSidebar";
import { EmailList } from "@/components/inbox/EmailList";
import { DetailPanel } from "@/components/inbox/DetailPanel";
import { useAriaStore } from "@/store/useAriaStore";
import { supabase } from "@/integrations/supabase/client";

export default function InboxPage() {
  const navigate = useNavigate();
  const { loadEmails, loadProfile } = useAriaStore();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/");
        return;
      }
      loadProfile();
      loadEmails();
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate("/");
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="grain flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <EmailList />
      <DetailPanel />
    </div>
  );
}

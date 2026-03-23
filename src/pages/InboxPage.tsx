import { useState } from "react";
import { AppSidebar } from "@/components/inbox/AppSidebar";
import { EmailList } from "@/components/inbox/EmailList";
import { DetailPanel } from "@/components/inbox/DetailPanel";

export default function InboxPage() {
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

  return (
    <div className="grain flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <EmailList selectedId={selectedEmailId} onSelect={setSelectedEmailId} />
      <DetailPanel emailId={selectedEmailId} />
    </div>
  );
}

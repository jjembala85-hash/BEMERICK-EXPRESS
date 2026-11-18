"use client";

import { useActionState } from "react";
import { deleteMessage, setMessageStatus, type InboxState } from "@/app/newsroom/(protected)/inbox/actions";
import { submitWithoutReset } from "@/lib/forms";

const button = "rounded-md border border-mist px-3 py-1.5 text-sm font-semibold text-ink hover:bg-mist disabled:opacity-60";

function StatusButton({ id, status, label }: { id: string; status: string; label: string }) {
  const [state, action, pending] = useActionState<InboxState, FormData>(setMessageStatus, {});
  return (
    <form onSubmit={submitWithoutReset(action)}>
      <input type="hidden" name="messageId" value={id} />
      <input type="hidden" name="status" value={status} />
      <button type="submit" disabled={pending} className={button}>{pending ? "Saving…" : label}</button>
      {state.error && <span role="alert" className="ml-2 text-sm text-ember">{state.error}</span>}
    </form>
  );
}

export function MessageControls({ id, status }: { id: string; status: "new" | "read" | "archived" }) {
  const [state, del, deleting] = useActionState<InboxState, FormData>(deleteMessage, {});
  return (
    <div className="flex flex-wrap gap-2">
      {status === "new" && <StatusButton id={id} status="read" label="Mark as read" />}
      {status !== "new" && status !== "archived" && <StatusButton id={id} status="new" label="Mark as new" />}
      {status !== "archived" ? <StatusButton id={id} status="archived" label="Archive" /> : <StatusButton id={id} status="read" label="Move back to inbox" />}
      <form
        onSubmit={(e) => {
          if (!window.confirm("Delete this message for good?")) {
            e.preventDefault();
            return;
          }
          submitWithoutReset(del)(e);
        }}
      >
        <input type="hidden" name="messageId" value={id} />
        <button type="submit" disabled={deleting} className={`${button} text-ember`}>{deleting ? "Deleting…" : "Delete"}</button>
      </form>
      {state.error && <span role="alert" className="text-sm text-ember">{state.error}</span>}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { TeamAccessModal } from "@/components/settings-v2/team-access/TeamAccessModal";
import type { UnifiedTeamMember } from "@/components/settings-v2/team-access/team-access-utils";

interface TeamAccessSendMessageModalProps {
  open: boolean;
  onClose: () => void;
  member: UnifiedTeamMember | null;
}

export function TeamAccessSendMessageModal({
  open,
  onClose,
  member,
}: TeamAccessSendMessageModalProps) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  if (!member) {
    return null;
  }

  function handleSend() {
    setSent(true);
  }

  function handleClose() {
    setSubject("");
    setMessage("");
    setSent(false);
    onClose();
  }

  return (
    <TeamAccessModal
      open={open}
      onClose={handleClose}
      title={`Send message to ${member.displayName}`}
      footer={
        sent ? (
          <div className="flex justify-end">
            <Button type="button" onClick={handleClose}>
              Done
            </Button>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSend}
              disabled={!subject.trim() || !message.trim()}
            >
              Send message
            </Button>
          </div>
        )
      }
    >
      {sent ? (
        <p className="text-sm text-cos-muted">
          Message queued for delivery to {member.email}. (Shell — messaging backend
          not yet connected.)
        </p>
      ) : (
        <div className="space-y-4">
          <Input label="To" value={member.email} readOnly disabled />
          <Input
            label="Subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="Quick update from the board"
          />
          <Textarea
            label="Message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Write your message..."
            rows={5}
          />
        </div>
      )}
    </TeamAccessModal>
  );
}

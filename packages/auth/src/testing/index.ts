export type CapturedEmail = {
  kind: "verification" | "magic-link" | "invitation";
  to: string;
  url: string;
  token: string;
};

export function createRecordingMailers() {
  const sent: CapturedEmail[] = [];

  return {
    sent,
    sendVerificationEmail(input: { user: { email: string }; url: string; token: string }) {
      sent.push({
        kind: "verification",
        to: input.user.email,
        url: input.url,
        token: input.token,
      });
      return Promise.resolve();
    },
    sendMagicLink(input: { email: string; url: string; token: string }) {
      sent.push({
        kind: "magic-link",
        to: input.email,
        url: input.url,
        token: input.token,
      });
      return Promise.resolve();
    },
    sendInvitationEmail(input: { email: string; url: string; invitationId: string }) {
      sent.push({
        kind: "invitation",
        to: input.email,
        url: input.url,
        token: input.invitationId,
      });
      return Promise.resolve();
    },
  };
}

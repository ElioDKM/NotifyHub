export type EmailContent = {
  text?: string;
  html?: string;
};

export type EmailConfig = {
  smtpHost: string;
  smtpPort: number;
  user: string | null;
  pass: string | null;
  from: string;
};

export type EmailSendInput = {
  to: string;
  subject: string;
  content: EmailContent;
  config: EmailConfig;
};

export type ExpoContent = {
  title: string;
  body: string;
};

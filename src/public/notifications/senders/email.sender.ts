import nodemailer, { Transporter } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

type EmailContent = {
  text?: string;
  html?: string;
};

type EmailConfig = {
  smtpHost: string;
  smtpPort: number;
  user: string | null;
  pass: string | null;
  from: string;
};

type EmailSendInput = {
  to: string;
  subject: string;
  content: EmailContent;
  config: EmailConfig;
  notificationId: string;
  tryNumber: number;
};

export class EmailSender {
  async send({
    to,
    subject,
    content,
    config,
    notificationId,
    tryNumber,
  }: EmailSendInput): Promise<void> {
    const transporter: Transporter<SMTPTransport.SentMessageInfo> =
      nodemailer.createTransport<SMTPTransport.Options>({
        host: config.smtpHost,
        port: config.smtpPort,
        auth: config.user
          ? {
              user: config.user,
              pass: config.pass ?? undefined,
            }
          : undefined,
        tls: {
          rejectUnauthorized: false,
        },
      });

    await transporter.sendMail({
      from: config.from,
      to,
      subject,
      text: content.text ?? undefined,
      html: content.html ?? undefined,
      headers: {
        'X-NotifyHub-Notification-Id': notificationId,
        'X-NotifyHub-Try': String(tryNumber),
      },
    });
  }
}

type ExpoContent = {
  title: string;
  body: string;
};

type ExpoSendInput = {
  to: string;
  content: ExpoContent;
};

export class ExpoSender {
  async send({ to, content }: ExpoSendInput): Promise<void> {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
        title: content.title,
        body: content.body,
      }),
    });
  }
}

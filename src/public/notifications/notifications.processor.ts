import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { NotificationsService } from './notifications.service';

type SendNotificationJob = { notificationId: string; tryNumber: number };

@Processor('notifications')
export class NotificationsProcessor extends WorkerHost {
  constructor(
    private readonly notificationsService: NotificationsService,
    @InjectQueue('notifications')
    private readonly queue: Queue<SendNotificationJob>,
  ) {
    super();
  }

  async process(job: Job<SendNotificationJob>) {
    const notificationId = job.data.notificationId;
    const tryNumber = job.data.tryNumber ?? 1;

    try {
      await this.notificationsService.performSend(notificationId, tryNumber);
    } catch (e) {
      const delays = [1000, 5000, 25000]; // délais du retry 1s / 5s / 25s
      const nextTry = tryNumber + 1;

      const isLast = tryNumber >= 3; // 3 tentatives max
      if (isLast) {
        await this.notificationsService.markFailed(notificationId, e);
        return;
      }

      const delay = delays[Math.min(tryNumber - 1, delays.length - 1)];

      // requeue
      await this.queue.add(
        'send',
        { notificationId, tryNumber: nextTry },
        {
          jobId: `${notificationId}:try:${nextTry}`,
          delay,
          removeOnComplete: true,
          removeOnFail: true,
        },
      );

      return;
    }
  }
}

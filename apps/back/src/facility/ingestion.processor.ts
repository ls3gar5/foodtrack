import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq'
import { Queue, Job } from 'bullmq'
import { IngestionService } from './ingestion.service'

@Injectable()
@Processor('facility-ingestion')
export class IngestionProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(IngestionProcessor.name)

  constructor(
    private readonly ingestionService: IngestionService,
    @InjectQueue('facility-ingestion')
    private readonly ingestionQueue: Queue,
  ) {
    super()
  }

  async onModuleInit(): Promise<void> {
    await this.ingestionQueue.add('import-facilities', {})
    this.logger.log('Enqueued facility ingestion job')
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing ingestion job ${job.id}`)

    const result = await this.ingestionService.importFacilities()

    this.logger.log(
      `Ingestion complete — imported: ${result.imported}, updated: ${result.updated}, skipped: ${result.skipped}`,
    )

    if (result.errors.length > 0) {
      this.logger.warn(`Ingestion had ${result.errors.length} error(s)`)
    }
  }
}

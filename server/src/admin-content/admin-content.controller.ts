import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBody,
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import type { User } from '../entities/user.entity.js';
import { AdminContentRevisionService } from './admin-content-revision.service.js';
import { AdminContentService } from './admin-content.service.js';
import { AdminContentImportService } from './admin-content-import.service.js';
import { CreateContentRevisionDraftDto } from './dto/create-content-revision-draft.dto.js';
import { ApplyImportJobDto } from './dto/apply-import-job.dto.js';
import { CreateAnswerDto } from './dto/create-answer.dto.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { CreateImportJobDto } from './dto/create-import-job.dto.js';
import { CreateImportJobCsvUploadDto } from './dto/create-import-job-csv-upload.dto.js';
import { DeleteAnswerDto } from './dto/delete-answer.dto.js';
import { ListAnswersQueryDto } from './dto/list-answers-query.dto.js';
import { ListCategoriesQueryDto } from './dto/list-categories-query.dto.js';
import { ListContentRevisionsQueryDto } from './dto/list-content-revisions-query.dto.js';
import { ListImportJobsQueryDto } from './dto/list-import-jobs-query.dto.js';
import { SetCategoryEnabledDto } from './dto/set-category-enabled.dto.js';
import { UpdateAnswerDto } from './dto/update-answer.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { TransitionContentRevisionDto } from './dto/transition-content-revision.dto.js';

interface AdminContentRequest {
  user: Pick<User, 'id' | 'role'>;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

const adminThrottleLimit = parsePositiveInt(
  process.env.ADMIN_THROTTLE_LIMIT,
  30,
);
const adminThrottleTtlMs = parsePositiveInt(
  process.env.ADMIN_THROTTLE_TTL_MS,
  60_000,
);
const adminMutationThrottleLimit = parsePositiveInt(
  process.env.ADMIN_MUTATION_THROTTLE_LIMIT,
  10,
);

@ApiTags('admin-content')
@ApiBearerAuth('JWT')
@Controller('admin/content')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin', 'super_admin')
@Throttle({
  default: {
    limit: adminThrottleLimit,
    ttl: adminThrottleTtlMs,
  },
})
export class AdminContentController {
  constructor(
    private adminContentService: AdminContentService,
    private adminContentImportService: AdminContentImportService,
    private adminContentRevisionService: AdminContentRevisionService,
  ) {}

  @Post('revisions/draft')
  @Throttle({
    default: {
      limit: adminMutationThrottleLimit,
      ttl: adminThrottleTtlMs,
    },
  })
  @ApiOperation({ summary: 'Capture current content as draft revision' })
  createDraftRevision(
    @Req() req: AdminContentRequest,
    @Body() dto: CreateContentRevisionDraftDto,
  ) {
    return this.adminContentRevisionService.createDraftFromCurrent(
      req.user,
      dto,
    );
  }

  @Get('revisions')
  @ApiOperation({ summary: 'List content revisions' })
  listRevisions(@Query() query: ListContentRevisionsQueryDto) {
    return this.adminContentRevisionService.listRevisions(query);
  }

  @Get('revisions/:revisionId')
  @ApiOperation({ summary: 'Get content revision details' })
  getRevision(@Param('revisionId', ParseUUIDPipe) revisionId: string) {
    return this.adminContentRevisionService.getRevision(revisionId);
  }

  @Post('revisions/:revisionId/review')
  @Throttle({
    default: {
      limit: adminMutationThrottleLimit,
      ttl: adminThrottleTtlMs,
    },
  })
  @ApiOperation({ summary: 'Move draft revision to in-review state' })
  submitRevisionForReview(
    @Req() req: AdminContentRequest,
    @Param('revisionId', ParseUUIDPipe) revisionId: string,
    @Body() dto: TransitionContentRevisionDto,
  ) {
    return this.adminContentRevisionService.submitForReview(
      req.user,
      revisionId,
      dto,
    );
  }

  @Post('revisions/:revisionId/publish')
  @Throttle({
    default: {
      limit: adminMutationThrottleLimit,
      ttl: adminThrottleTtlMs,
    },
  })
  @ApiOperation({
    summary: 'Publish revision and apply snapshot to live content',
  })
  publishRevision(
    @Req() req: AdminContentRequest,
    @Param('revisionId', ParseUUIDPipe) revisionId: string,
    @Body() dto: TransitionContentRevisionDto,
  ) {
    return this.adminContentRevisionService.publishRevision(
      req.user,
      revisionId,
      dto,
    );
  }

  @Post('revisions/:revisionId/rollback')
  @Throttle({
    default: {
      limit: adminMutationThrottleLimit,
      ttl: adminThrottleTtlMs,
    },
  })
  @ApiOperation({ summary: 'Rollback live content to a published revision' })
  rollbackRevision(
    @Req() req: AdminContentRequest,
    @Param('revisionId', ParseUUIDPipe) revisionId: string,
    @Body() dto: TransitionContentRevisionDto,
  ) {
    return this.adminContentRevisionService.rollbackToRevision(
      req.user,
      revisionId,
      dto,
    );
  }

  @Post('import-jobs')
  @Throttle({
    default: {
      limit: adminMutationThrottleLimit,
      ttl: adminThrottleTtlMs,
    },
  })
  @ApiOperation({ summary: 'Create bulk import validation job (CSV or JSON)' })
  createImportJob(
    @Req() req: AdminContentRequest,
    @Body() dto: CreateImportJobDto,
  ) {
    return this.adminContentImportService.createImportJob(req.user, dto);
  }

  @Post('import-jobs/upload-csv')
  @UseInterceptors(FileInterceptor('file'))
  @Throttle({
    default: {
      limit: adminMutationThrottleLimit,
      ttl: adminThrottleTtlMs,
    },
  })
  @ApiOperation({
    summary: 'Create bulk import validation job from uploaded CSV file',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'reason'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        reason: {
          type: 'string',
          minLength: 5,
          maxLength: 500,
        },
        dryRun: {
          type: 'boolean',
          default: true,
        },
      },
    },
  })
  createImportJobFromCsvUpload(
    @Req() req: AdminContentRequest,
    @UploadedFile()
    file:
      | {
          originalname?: string;
          mimetype?: string;
          size?: number;
          buffer?: Buffer;
        }
      | undefined,
    @Body() dto: CreateImportJobCsvUploadDto,
  ) {
    return this.adminContentImportService.createImportJobFromCsvUpload(
      req.user,
      dto,
      file,
    );
  }

  @Get('import-jobs')
  @ApiOperation({ summary: 'List import jobs with pagination' })
  listImportJobs(@Query() query: ListImportJobsQueryDto) {
    return this.adminContentImportService.listImportJobs(query);
  }

  @Get('import-jobs/:jobId')
  @ApiOperation({ summary: 'Get import job status and validation result' })
  getImportJob(@Param('jobId', ParseUUIDPipe) jobId: string) {
    return this.adminContentImportService.getImportJob(jobId);
  }

  @Post('import-jobs/:jobId/apply')
  @Throttle({
    default: {
      limit: adminMutationThrottleLimit,
      ttl: adminThrottleTtlMs,
    },
  })
  @ApiOperation({ summary: 'Apply a previously validated import job' })
  applyImportJob(
    @Req() req: AdminContentRequest,
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Body() dto: ApplyImportJobDto,
  ) {
    return this.adminContentImportService.applyImportJob(req.user, jobId, dto);
  }

  @Get('categories')
  @ApiOperation({ summary: 'List categories with filters and pagination' })
  listCategories(@Query() query: ListCategoriesQueryDto) {
    return this.adminContentService.listCategories(query);
  }

  @Post('categories')
  @Throttle({
    default: {
      limit: adminMutationThrottleLimit,
      ttl: adminThrottleTtlMs,
    },
  })
  @ApiOperation({ summary: 'Create category with validation and audit log' })
  createCategory(
    @Req() req: AdminContentRequest,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.adminContentService.createCategory(req.user, dto);
  }

  @Patch('categories/:categoryId')
  @Throttle({
    default: {
      limit: adminMutationThrottleLimit,
      ttl: adminThrottleTtlMs,
    },
  })
  @ApiOperation({ summary: 'Update category fields and audit changes' })
  updateCategory(
    @Req() req: AdminContentRequest,
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.adminContentService.updateCategory(req.user, categoryId, dto);
  }

  @Patch('categories/:categoryId/enabled')
  @Throttle({
    default: {
      limit: adminMutationThrottleLimit,
      ttl: adminThrottleTtlMs,
    },
  })
  @ApiOperation({ summary: 'Enable or disable category' })
  setCategoryEnabled(
    @Req() req: AdminContentRequest,
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Body() dto: SetCategoryEnabledDto,
  ) {
    return this.adminContentService.setCategoryEnabled(
      req.user,
      categoryId,
      dto,
    );
  }

  @Get('categories/:categoryId/answers')
  @ApiOperation({ summary: 'List answers in a category' })
  listAnswers(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Query() query: ListAnswersQueryDto,
  ) {
    return this.adminContentService.listAnswers(categoryId, query);
  }

  @Post('categories/:categoryId/answers')
  @Throttle({
    default: {
      limit: adminMutationThrottleLimit,
      ttl: adminThrottleTtlMs,
    },
  })
  @ApiOperation({ summary: 'Create answer with dedupe and validation' })
  createAnswer(
    @Req() req: AdminContentRequest,
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Body() dto: CreateAnswerDto,
  ) {
    return this.adminContentService.createAnswer(req.user, categoryId, dto);
  }

  @Patch('answers/:answerId')
  @Throttle({
    default: {
      limit: adminMutationThrottleLimit,
      ttl: adminThrottleTtlMs,
    },
  })
  @ApiOperation({ summary: 'Update answer with dedupe and validation' })
  updateAnswer(
    @Req() req: AdminContentRequest,
    @Param('answerId', ParseIntPipe) answerId: number,
    @Body() dto: UpdateAnswerDto,
  ) {
    return this.adminContentService.updateAnswer(req.user, answerId, dto);
  }

  @Delete('answers/:answerId')
  @Throttle({
    default: {
      limit: adminMutationThrottleLimit,
      ttl: adminThrottleTtlMs,
    },
  })
  @ApiOperation({ summary: 'Delete answer and write audit log' })
  @ApiResponse({ status: 200, description: 'Answer deleted' })
  deleteAnswer(
    @Req() req: AdminContentRequest,
    @Param('answerId', ParseIntPipe) answerId: number,
    @Body() dto: DeleteAnswerDto,
  ) {
    return this.adminContentService.deleteAnswer(req.user, answerId, dto);
  }
}

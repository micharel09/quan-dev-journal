import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../roles/roles.decorator';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import type { JwtPayloadType } from '../auth/strategies/types/jwt-payload.type';
import { ArticlesService } from './articles.service';
import {
  CreateArticleDto,
  QueryArticleDto,
  UpdateArticleDto,
} from './article.dto';

@ApiTags('Articles')
@Controller({ path: 'articles', version: '1' })
export class ArticlesController {
  constructor(private readonly articles: ArticlesService) {}
  @Get() list(@Query() query: QueryArticleDto) {
    return this.articles.list(query);
  }
  @Get('tags') tags() {
    return this.articles.tags();
  }
  @Get(':slug') find(@Param('slug') slug: string) {
    return this.articles.find(slug);
  }
  @Post()
  @ApiBearerAuth()
  @Roles(RoleEnum.admin)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  create(
    @Body() dto: CreateArticleDto,
    @Request() request: { user: JwtPayloadType },
  ) {
    return this.articles.create(dto, request.user.id);
  }
  @Patch(':slug')
  @ApiBearerAuth()
  @Roles(RoleEnum.admin)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  update(@Param('slug') slug: string, @Body() dto: UpdateArticleDto) {
    return this.articles.update(slug, dto);
  }
  @Delete(':slug')
  @HttpCode(204)
  @ApiBearerAuth()
  @Roles(RoleEnum.admin)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  remove(@Param('slug') slug: string) {
    return this.articles.remove(slug);
  }
}

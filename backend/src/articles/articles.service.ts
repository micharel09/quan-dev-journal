import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, QueryFailedError, Repository } from 'typeorm';
import { ArticleEntity } from './article.entity';
import {
  CreateArticleDto,
  QueryArticleDto,
  UpdateArticleDto,
} from './article.dto';
import { Slug } from './slug';
import { UsersService } from '../users/users.service';
import { User } from '../users/domain/user';

@Injectable()
export class ArticlesService {
  constructor(
    @InjectRepository(ArticleEntity)
    private readonly repository: Repository<ArticleEntity>,
    private readonly users: UsersService,
  ) {}

  async list(query: QueryArticleDto) {
    const builder = this.repository.createQueryBuilder('article');
    if (query.q?.trim()) {
      // Literal substring search: %, _ and backslash are not user wildcards.
      const q = `%${query.q.trim().replace(/[\\%_]/g, '\\$&')}%`;
      builder.andWhere(
        new Brackets((where) =>
          where
            .where('article.title ILIKE :q', { q })
            .orWhere('article.summary ILIKE :q', { q }),
        ),
      );
    }
    if (query.tag)
      builder.andWhere(':tag = ANY(article.tags)', { tag: query.tag });
    const [articles, total] = await builder
      .orderBy('article.createdAt', 'DESC')
      .addOrderBy('article.id', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return { articles, total, page: query.page, limit: query.limit };
  }

  async tags(): Promise<string[]> {
    const rows: { tag: string }[] = await this.repository.query(
      'SELECT DISTINCT unnest(tags) AS tag FROM article ORDER BY tag',
    );
    return rows.map((row) => row.tag);
  }

  async find(slug: string) {
    const article = await this.repository.findOneBy({ slug });
    if (!article) throw new NotFoundException('Article not found');
    return article;
  }

  async create(dto: CreateArticleDto, userId: User['id']) {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundException('Author not found');
    const author =
      [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Quan';
    const base = Slug.fromTitle(dto.title);
    // Conduit's atomic unique-constraint retry, adapted from Prisma to PostgreSQL/TypeORM.
    for (let attempt = 1; attempt <= 50; attempt++) {
      const slug = (attempt === 1 ? base : base.withSuffix(attempt)).value;
      try {
        return await this.repository.save(
          this.repository.create({
            ...dto,
            tags: [...new Set(dto.tags)],
            slug,
            author,
          }),
        );
      } catch (error) {
        if (error instanceof QueryFailedError) {
          const driver = error.driverError as {
            code?: string;
            constraint?: string;
          };
          if (
            driver.code === '23505' &&
            driver.constraint === 'UQ_article_slug'
          )
            continue;
        }
        throw error;
      }
    }
    throw new ConflictException('Slug resolution exhausted');
  }

  async update(slug: string, dto: UpdateArticleDto) {
    const article = await this.find(slug);
    // Stable public URL even when the title changes; author and dates are not writable DTO fields.
    Object.assign(
      article,
      dto,
      dto.tags ? { tags: [...new Set(dto.tags)] } : {},
    );
    return this.repository.save(article);
  }

  async remove(slug: string) {
    const result = await this.repository.delete({ slug });
    if (!result.affected) throw new NotFoundException('Article not found');
  }
}

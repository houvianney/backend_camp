import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import path from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisCacheService } from '../../common/cache/redis.service';

interface UploadedFileLike {
  originalname?: string;
  buffer?: Buffer;
  mimetype?: string;
}

@Injectable()
export class AlbumsService {
  constructor(
    private prisma: PrismaService,
    private cache: RedisCacheService,
  ) {}

  createAlbum(data: { titre: string; jour?: number; activite?: string }) {
    return this.prisma.album.create({ data });
  }

  private sanitizeName(name: string) {
    return name
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9.-]/g, '-')
      .toLowerCase();
  }

  /** Ajout de photos en lot dans un album (urls déjà uploadées ou fichiers envoyés en multipart) */
  async ajouterPhotos(albumId: string, urls: string[], files: UploadedFileLike[] = []) {
    const saved = [] as Array<{ url: string }>;

    if (files?.length) {
      const uploadDir = process.env.UPLOAD_DIR || './uploads';
      const albumDir = path.resolve(uploadDir, 'albums', albumId);
      await fs.mkdir(albumDir, { recursive: true });

      for (const file of files) {
        const originalName = file.originalname || 'photo';
        const buffer = file.buffer || Buffer.from('');
        const safeName = `${Date.now()}-${this.sanitizeName(originalName)}`;
        const fullPath = path.join(albumDir, safeName);
        await fs.writeFile(fullPath, buffer);
        const publicPath = `/uploads/albums/${albumId}/${safeName}`;
        saved.push({ url: publicPath });
      }
    }

    if (urls?.length) {
      saved.push(...urls.map((url) => ({ url })));
    }

    if (!saved.length) {
      return { count: 0 };
    }

    return this.prisma.photo.createMany({
      data: saved.map((item) => ({ albumId, url: item.url })),
    });
  }

  /** Consultation publique (participants): albums groupés par jour/activité avec pagination et cache */
  async findAllAvecPhotos(page = 1, limit = 20) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
    const cacheKey = `albums:${safePage}:${safeLimit}`;

    const cached = await this.cache.get<any>(cacheKey);
    if (cached) return cached;

    const [albums, total] = await Promise.all([
      this.prisma.album.findMany({
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        include: { photos: { orderBy: { createdAt: 'asc' }, take: 50 } },
        orderBy: [{ jour: 'asc' }],
      }),
      this.prisma.album.count(),
    ]);

    const payload = { albums, total, page: safePage, limit: safeLimit };
    await this.cache.set(cacheKey, payload, 120);
    return payload;
  }

  async deletePhoto(albumId: string, photoId: string) {
    const photo = await this.prisma.photo.findFirst({ where: { id: photoId, albumId } });
    if (!photo) {
      throw new Error('Photo introuvable');
    }

    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const filePath = path.resolve(uploadDir, 'albums', albumId, path.basename(photo.url));
    await fs.unlink(filePath).catch(() => undefined);

    return this.prisma.photo.delete({ where: { id: photoId } });
  }

  async deleteAlbum(albumId: string) {
    const album = await this.prisma.album.findUnique({ where: { id: albumId } });
    if (!album) {
      throw new Error('Album introuvable');
    }

    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const albumDir = path.resolve(uploadDir, 'albums', albumId);
    await fs.rm(albumDir, { recursive: true, force: true }).catch(() => undefined);

    await this.prisma.photo.deleteMany({ where: { albumId } });
    return this.prisma.album.delete({ where: { id: albumId } });
  }
}

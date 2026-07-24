import { Body, Controller, Delete, Get, Param, Post, Query, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { IsArray, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { AlbumsService } from './albums.service';

class CreateAlbumDto {
  @IsString() titre: string;
  @IsOptional() @IsInt() @Min(1) jour?: number;
  @IsOptional() @IsString() activite?: string;
}

class AjouterPhotosDto {
  @IsOptional() @IsArray() urls?: string[];
  @IsOptional() @IsArray() files?: Array<{ name: string; data: string }>;
}

@Controller('albums')
export class AlbumsController {
  constructor(private albumsService: AlbumsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateAlbumDto) {
    return this.albumsService.createAlbum(dto);
  }

  @Post(':id/photos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(FilesInterceptor('files'))
  ajouterPhotos(
    @Param('id') id: string,
    @UploadedFiles() files: Array<{ originalname?: string; buffer?: Buffer; mimetype?: string }>,
    @Body() dto: AjouterPhotosDto,
  ) {
    return this.albumsService.ajouterPhotos(id, dto.urls || [], files || []);
  }

  @Delete(':id/photos/:photoId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  supprimerPhoto(@Param('id') id: string, @Param('photoId') photoId: string) {
    return this.albumsService.deletePhoto(id, photoId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  supprimerAlbum(@Param('id') id: string) {
    return this.albumsService.deleteAlbum(id);
  }

  @Get()
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    // accessible publiquement aux participants via leur lien / QR
    return this.albumsService.findAllAvecPhotos(Number(page), Number(limit));
  }
}

import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { IsBoolean, IsEmail, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { ParticipantsService } from './participants.service';

class CreateParticipantDto {
  @IsString() nom: string;
  @IsString() prenom: string;
  @IsOptional() @IsString() telephone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsIn(['M', 'F']) sexe?: 'M' | 'F';
  @IsOptional() @IsNumber() @Min(0) age?: number;
  @IsOptional() @IsString() profession?: string;
  @IsOptional() @IsString() adresse?: string;
  @IsOptional() @IsString() contact?: string;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsBoolean() membreOng?: boolean;
  @IsOptional() @IsIn(['PARTICIPANT', 'STAFF', 'ENSEIGNANT', 'VOLONTAIRE']) typeParticipant?: 'PARTICIPANT' | 'STAFF' | 'ENSEIGNANT' | 'VOLONTAIRE';
  @IsOptional() @IsIn(['Entretien', 'Podium', 'Formateur Académie', 'Media', 'Cuisine', 'Accueil', 'Sécurité', 'Prestations', 'Inscription', 'Organisateurs']) typeStaff?: 'Entretien' | 'Podium' | 'Formateur Académie' | 'Media' | 'Cuisine' | 'Accueil' | 'Sécurité' | 'Prestations' | 'Inscription' | 'Organisateurs';
  @IsOptional() @IsString() tailleTshirt?: string;
  @IsOptional() @IsString() localiteId?: string;
  @IsNumber() @Min(0) montantTotal: number;
  @IsNumber() @Min(0) montantPaye: number;
}

class UpdateMontantDto {
  @IsNumber() @Min(0) montantAjoute: number;
}

class ValiderPlusieursDto {
  @IsString({ each: true }) participantIds: string[];
}

class UpdateParticipantDto {
  @IsOptional() @IsString() nom?: string;
  @IsOptional() @IsString() prenom?: string;
  @IsOptional() @IsString() telephone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsIn(['M', 'F']) sexe?: 'M' | 'F';
  @IsOptional() @IsNumber() @Min(0) age?: number;
  @IsOptional() @IsString() profession?: string;
  @IsOptional() @IsString() adresse?: string;
  @IsOptional() @IsString() contact?: string;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsBoolean() membreOng?: boolean;
  @IsOptional() @IsIn(['PARTICIPANT', 'STAFF', 'ENSEIGNANT', 'VOLONTAIRE']) typeParticipant?: 'PARTICIPANT' | 'STAFF' | 'ENSEIGNANT' | 'VOLONTAIRE';
  @IsOptional() @IsIn(['Entretien', 'Podium', 'Formateur Académie', 'Media', 'Cuisine', 'Accueil', 'Sécurité', 'Prestations', 'Inscription', 'Organisateurs']) typeStaff?: 'Entretien' | 'Podium' | 'Formateur Académie' | 'Media' | 'Cuisine' | 'Accueil' | 'Sécurité' | 'Prestations' | 'Inscription' | 'Organisateurs';
  @IsOptional() @IsString() tailleTshirt?: string;
  @IsOptional() @IsString() localiteId?: string;
  @IsOptional() @IsNumber() @Min(0) montantTotal?: number;
  @IsOptional() @IsNumber() @Min(0) montantPaye?: number;
}

@Controller('participants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ParticipantsController {
  constructor(private participantsService: ParticipantsService) {}

  // --- Responsable de localité ---

  @Post()
  @Roles(Role.RESPONSABLE, Role.ADMIN)
  inscrire(@Body() dto: CreateParticipantDto, @Req() req: any) {
    // If admin creates, they should provide localiteId in dto; responsable will have theirs used in service
    return this.participantsService.inscrireParResponsable(req.user.id, dto);
  }

  @Patch(':id/montant')
  @Roles(Role.RESPONSABLE)
  updateMontant(@Param('id') id: string, @Body() dto: UpdateMontantDto, @Req() req: any) {
    return this.participantsService.mettreAJourMontant(req.user.id, id, dto.montantAjoute);
  }

  @Get('ma-localite')
  @Roles(Role.RESPONSABLE)
  mesParticipants(@Req() req: any) {
    return this.participantsService.listeParLocalite(req.user.localiteId);
  }

  @Delete(':id')
  @Roles(Role.RESPONSABLE, Role.ADMIN)
  supprimer(@Param('id') id: string, @Req() req: any) {
    return this.participantsService.supprimerParResponsable(req.user.id, id, req.user.role);
  }

  @Patch(':id')
  @Roles(Role.RESPONSABLE, Role.ADMIN)
  updateParticipant(@Param('id') id: string, @Body() dto: UpdateParticipantDto, @Req() req: any) {
    return this.participantsService.mettreAJourParticipant(req.user, id, dto);
  }

  // --- Admin ---

  @Get()
  @Roles(Role.ADMIN)
  listeGlobale(@Query('statut') statut?: 'EN_ATTENTE' | 'VALIDE', @Query('localiteId') localiteId?: string) {
    return this.participantsService.listeGlobale({ statut, localiteId });
  }

  @Post(':id/valider')
  @Roles(Role.ADMIN)
  valider(@Param('id') id: string, @Req() req: any) {
    return this.participantsService.validerParAdmin(req.user.id, id);
  }

  @Post('valider-many')
  @Roles(Role.ADMIN)
  validerPlusieurs(@Body() dto: ValiderPlusieursDto, @Req() req: any) {
    return this.participantsService.validerPlusieursParAdmin(req.user.id, dto.participantIds);
  }
}

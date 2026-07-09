import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { LocalitesModule } from './modules/localites/localites.module';
import { ParticipantsModule } from './modules/participants/participants.module';
import { BadgesModule } from './modules/badges/badges.module';
import { RessourcesModule } from './modules/ressources/ressources.module';
import { DistributionsModule } from './modules/distributions/distributions.module';
import { ProgrammeModule } from './modules/programme/programme.module';
import { AlbumsModule } from './modules/albums/albums.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    LocalitesModule,
    ParticipantsModule,
    BadgesModule,
    RessourcesModule,
    DistributionsModule,
    ProgrammeModule,
    AlbumsModule,
  ],
})
export class AppModule {}

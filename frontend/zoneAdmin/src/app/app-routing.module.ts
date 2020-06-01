import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { MainComponent } from './main/main.component';
import { AuthGuard } from './auth.guard';
import { RoleGuardService as RoleGuard } from './role-guard';
import { AdminUsersComponent } from './admin-users/admin-users.component';
import { ZoneAdminComponent } from './zone-admin/zone-admin.component';
import { AppVersionsComponent } from './app-versions/app-versions.component';
import { SysPropertiesComponent } from './sys-properties/sys-properties.component'
import { AboutPageComponent } from './about-page/about-page.component'
import { UpdateZoneJobsComponent } from './update-zone-jobs/update-zone-jobs.component';

const routes: Routes = [

  { path: '', component: MainComponent, canActivate: [AuthGuard], runGuardsAndResolvers: 'always' },
  { path: 'main', component: MainComponent, canActivate: [AuthGuard], runGuardsAndResolvers: 'always' },
  { path: 'admin', component: AdminUsersComponent, canActivate: [RoleGuard], runGuardsAndResolvers: 'always', data: { allowedRoles: ['Admin'] } },
  { path: 'zone-admin', component: ZoneAdminComponent, canActivate: [RoleGuard], runGuardsAndResolvers: 'always', data: { allowedRoles: ['Admin', 'Zone-Admin', 'Zone-Users'] } },
  { path: 'app-versions', component: AppVersionsComponent, canActivate: [RoleGuard], runGuardsAndResolvers: 'always', data: { allowedRoles: ['Admin', 'Zone-Admin', 'Zone-Users'] } },
  { path: 'system-properties', component: SysPropertiesComponent, canActivate: [RoleGuard], runGuardsAndResolvers: 'always', data: { allowedRoles: ['Admin', 'Zone-Admin'] } },
  { path: 'zone-jobs', component: UpdateZoneJobsComponent, canActivate: [RoleGuard], runGuardsAndResolvers: 'always', data: { allowedRoles: ['Admin', 'Zone-Admin'] } },
  { path: 'about', component: AboutPageComponent, canActivate: [RoleGuard], runGuardsAndResolvers: 'always', data: { allowedRoles: ['Admin', 'Zone-Admin', 'Zone-Users', 'Zone-Guests'] } },
  { path: 'login', component: LoginComponent, runGuardsAndResolvers: 'always' },
  { path: 'register', component: RegisterComponent, runGuardsAndResolvers: 'always' },

  // otherwise redirect to home
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true, onSameUrlNavigation: 'reload' })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
export const RoutingComponents = [
  LoginComponent,
  MainComponent,
  AdminUsersComponent,
  ZoneAdminComponent,
  AppVersionsComponent,
  SysPropertiesComponent,
  UpdateZoneJobsComponent,
]

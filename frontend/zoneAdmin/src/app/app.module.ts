import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { JwtModule, JWT_OPTIONS  } from '@auth0/angular-jwt';
import { AppGlobals } from './app.globals';
import { AuthGuard } from './auth.guard';
import { RoleGuardService } from './role-guard';

import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppRoutingModule, RoutingComponents } from './app-routing.module';
import { CdkDetailRowDirective } from './cdk-detail-row.directive';
import { DigitOnlyDirective } from './digit-only.directive';
import { AppComponent } from './app.component';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MaterialModule } from './material.module';
import { ToastrModule } from 'ngx-toastr';
import { AuthService } from './auth.service';
import { TokenInterceptorService } from './token-interceptor.service';
import { HttpErrorInterceptor } from './http-error.interceptor';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { MainComponent } from './main/main.component';
import { AdminUsersComponent } from './admin-users/admin-users.component';
import { AddUserComponent } from './admin-users/dialogs/add-user/add-user.component';
import { DeleteUserComponent } from './admin-users/dialogs/delete-user/delete-user.component';
import { EditUserComponent } from './admin-users/dialogs/edit-user/edit-user.component';
import { ZoneAdminComponent } from './zone-admin/zone-admin.component';
import { AddZoneComponent } from './zone-admin/dialogs/add-zone/add-zone.component';
import { DeleteZoneComponent } from './zone-admin/dialogs/delete-zone/delete-zone.component';
import { EditZoneComponent } from './zone-admin/dialogs/edit-zone/edit-zone.component';
import { AppVersionsComponent } from './app-versions/app-versions.component';
import { AddAppVersionsComponent } from './app-versions/dialogs/add-app-versions/add-app-versions.component';
import { DeleteAppVersionsComponent } from './app-versions/dialogs/delete-app-versions/delete-app-versions.component';
import { EditAppVersionsComponent } from './app-versions/dialogs/edit-app-versions/edit-app-versions.component';
import { SysPropertiesComponent } from './sys-properties/sys-properties.component';
import { RefreshZoneComponent } from './zone-admin/dialogs/refresh-zone/refresh-zone.component';
import { ScheduleZoneComponent } from './zone-admin/dialogs/schedule-zone/schedule-zone.component';
import { AboutPageComponent } from './about-page/about-page.component';
import { UpdateZoneJobsComponent } from './update-zone-jobs/update-zone-jobs.component';
import { DeleteJobComponent } from './update-zone-jobs/dialogs/delete-job/delete-job.component';
import { EditJobComponent } from './update-zone-jobs/dialogs/edit-job/edit-job.component';

@NgModule({
  declarations: [
    CdkDetailRowDirective,
    AppComponent,
    RoutingComponents,
    LoginComponent,
    RegisterComponent,
    MainComponent,
    AdminUsersComponent,
    AddUserComponent,
    DeleteUserComponent,
    EditUserComponent,
    ZoneAdminComponent,
    AddZoneComponent,
    DeleteZoneComponent,
    EditZoneComponent,
    AppVersionsComponent,
    AddAppVersionsComponent,
    DeleteAppVersionsComponent,
    EditAppVersionsComponent,
    DigitOnlyDirective,
    SysPropertiesComponent,
    RefreshZoneComponent,
    ScheduleZoneComponent,
    AboutPageComponent,
    UpdateZoneJobsComponent,
    DeleteJobComponent,
    EditJobComponent,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    BrowserAnimationsModule,
    ReactiveFormsModule,
    FormsModule,
    MaterialModule,
    AppRoutingModule,
    ToastrModule.forRoot(),
    JwtModule.forRoot({})
  ],
  entryComponents: [
    AddUserComponent,
    DeleteUserComponent,
    EditUserComponent,
    DeleteZoneComponent,
    AddAppVersionsComponent,
    DeleteAppVersionsComponent,
    EditAppVersionsComponent,
    EditZoneComponent,
    AddZoneComponent,
    RefreshZoneComponent,
    ScheduleZoneComponent,
    DeleteJobComponent,
    EditJobComponent,
  ],
  providers: [
    AppGlobals,
    { provide: JWT_OPTIONS, useValue: JWT_OPTIONS },
    AuthService,
    AuthGuard,
    RoleGuardService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: TokenInterceptorService,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: HttpErrorInterceptor,
      multi: true
    },
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }

import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { AppGlobals } from '../app.globals';
import { SysPropertiesService } from "../sys-properties.service";
import { SystemProperties } from '../model/systemPropertiesSchema';
import { NavBarServiceService } from '../nav-bar-service.service';
// import { MatPaginator, MatSort, MatTableDataSource, MatDialog } from '@angular/material';
import { FormGroup, FormBuilder, AbstractControl, Validators, FormControl, ValidatorFn, ValidationErrors, FormGroupDirective } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-sys-properties',
  templateUrl: './sys-properties.component.html',
  styleUrls: ['./sys-properties.component.scss']
})
export class SysPropertiesComponent implements OnInit {
  sysPropSubscription: any;
  propList: SystemProperties[] = [];
  updateSysProp: FormGroup;
  readAccess = true;
  submitBtn = false;

  constructor(
    private sysPropertiesService: SysPropertiesService,
    public toastrService: ToastrService,
    public globals: AppGlobals,
    private fb: FormBuilder,
    private navBarServiceService: NavBarServiceService,
  ) { }

  ngOnInit() {
    this.navBarServiceService.changeMessage("System Properties");

    this.updateSysProp = this.fb.group({
      loginSessionTimeout: new FormControl(''),
      sessionIssuer: new FormControl(''),
      sessionAudience: new FormControl(''),
      ldapServers: new FormControl(''),
      ldapUserBindDn: new FormControl(''),
      ldapUserBaseDn: new FormControl(''),
      ldapServerConTimeout: new FormControl(''),
      ldapProto: new FormControl(''),
      ldapsHostFqDomain: new FormControl(''),
      ldapCertCALoc: new FormControl(''),
      dc1LdapPorifleName: new FormControl(''),
      dc1LdapPorifleIp: new FormControl(''),
      dc2LdapPorifleName: new FormControl(''),
      dc2LdapPorifleIp: new FormControl(''),
      keyPassword: new FormControl('', [Validators.required]),
      radZonePort: new FormControl('', [Validators.required]),
      minZonePort: new FormControl('', [Validators.required]),
      radZoneAvalTimeOut: new FormControl(''),
      jiraLogin: new FormControl(''),
      jiraPassword: new FormControl(''),
      jiraApiUrl: new FormControl(''),
      rootGlobalHostUser: new FormControl(''),
      rootGlobalHostPassword: new FormControl(''),
      rootZoneUser: new FormControl(''),
      rootZonePassword: new FormControl(''),
      zfssaUrl: new FormControl('', [Validators.required]),
      zfssaUser: new FormControl('', [Validators.required]),
      zfssaPassword: new FormControl('', [Validators.required]),
      zfssaPool: new FormControl('', [Validators.required]),
      zfssaProject: new FormControl('', [Validators.required]),
      zfssaAppsQuota: new FormControl(''),
      zfssaDbQuota: new FormControl(''),
      globalHostList: new FormControl('', [Validators.required]),
      globalDcList: new FormControl('', [Validators.required]),
      primeDc: new FormControl('', [Validators.required]),
      nodeDomain: new FormControl(''),
      winstonLogLevel: new FormControl(''),
    });

    if (this.globals.getCurrentRole() === 'Admin') {
      this.readAccess = false;
      this.submitBtn = true;
    }

    this.getSystemProps();
  }

  getSystemProps() {
    this.sysPropSubscription = this.sysPropertiesService.getSystemProps(this.globals.getEnvironment('baseUrl'))
      .subscribe((systemProperties: SystemProperties[]) => {
        localStorage.setItem('token', systemProperties['token']);

        if (systemProperties['message'].length > 0) {
          this.updateSysProp.patchValue({
            ['loginSessionTimeout']: systemProperties['message'][0]['loginSessionTimeout'],
            ['sessionIssuer']: systemProperties['message'][0]['sessionIssuer'],
            ['sessionAudience']: systemProperties['message'][0]['sessionAudience'],
            ['ldapServers']: systemProperties['message'][0]['ldapServers'],
            ['ldapUserBindDn']: systemProperties['message'][0]['ldapUserBindDn'],
            ['ldapUserBaseDn']: systemProperties['message'][0]['ldapUserBaseDn'],
            ['ldapServerConTimeout']: systemProperties['message'][0]['ldapServerConTimeout'],
            ['ldapProto']: systemProperties['message'][0]['ldapProto'],
            ['ldapsHostFqDomain']: systemProperties['message'][0]['ldapsHostFqDomain'],
            ['ldapCertCALoc']: systemProperties['message'][0]['ldapCertCALoc'],
            ['dc1LdapPorifleName']: systemProperties['message'][0]['dc1LdapPorifleName'],
            ['dc1LdapPorifleIp']: systemProperties['message'][0]['dc1LdapPorifleIp'],
            ['dc2LdapPorifleName']: systemProperties['message'][0]['dc2LdapPorifleName'],
            ['dc2LdapPorifleIp']: systemProperties['message'][0]['dc2LdapPorifleIp'],
            ['minZonePort']: systemProperties['message'][0]['minZonePort'],
            ['radZonePort']: systemProperties['message'][0]['radZonePort'],
            ['keyPassword']: systemProperties['message'][0]['keyPassword'],
            ['radZoneAvalTimeOut']: systemProperties['message'][0]['radZoneAvalTimeOut'],
            ['jiraLogin']: systemProperties['message'][0]['jiraLogin'],
            ['jiraPassword']: systemProperties['message'][0]['jiraPassword'],
            ['jiraApiUrl']: systemProperties['message'][0]['jiraApiUrl'],
            ['rootGlobalHostUser']: systemProperties['message'][0]['rootGlobalHostUser'],
            ['rootGlobalHostPassword']: systemProperties['message'][0]['rootGlobalHostPassword'],
            ['rootZoneUser']: systemProperties['message'][0]['rootZoneUser'],
            ['rootZonePassword']: systemProperties['message'][0]['rootZonePassword'],
            ['zfssaUrl']: systemProperties['message'][0]['zfssaUrl'],
            ['zfssaUser']: systemProperties['message'][0]['zfssaUser'],
            ['zfssaPassword']: systemProperties['message'][0]['zfssaPassword'],
            ['zfssaPool']: systemProperties['message'][0]['zfssaPool'],
            ['zfssaProject']: systemProperties['message'][0]['zfssaProject'],
            ['zfssaAppsQuota']: systemProperties['message'][0]['zfssaAppsQuota'],
            ['zfssaDbQuota']: systemProperties['message'][0]['zfssaDbQuota'],
            ['globalHostList']: systemProperties['message'][0]['globalHostList'],
            ['globalDcList']: systemProperties['message'][0]['globalDcList'],
            ['primeDc']:systemProperties['message'][0]['primeDc'],
            ['nodeDomain']: systemProperties['message'][0]['nodeDomain'],
            ['winstonLogLevel']: systemProperties['message'][0]['winstonLogLevel'],
          });
        }
      });
  }

  updateSystemProps() {
    //console.log(this.updateSysProp.value);

    this.sysPropertiesService.updateSystemProp(this.globals.getEnvironment('baseUrl'), this.updateSysProp.value)
      .subscribe(result => {
        this.toastrService.success('Successfully updated', '', {
          timeOut: 5000,
          positionClass: 'toast-bottom-center',
        });
      },
        (err: HttpErrorResponse) => {
          this.toastrService.error('Error occurred. Details: ' + err.name + ' ' + err.message, '', {
            timeOut: 8000,
            positionClass: 'toast-bottom-center',
          });
        }
      );
  }

  ngOnDestroy(): void {
    this.sysPropSubscription.unsubscribe();
  }

}

// let propList: updateSysProp[] = [];

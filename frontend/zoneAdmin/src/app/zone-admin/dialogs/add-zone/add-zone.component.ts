import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { AppGlobals } from '../../../app.globals';
import { Component, Inject, OnInit } from '@angular/core';
import { AuthService } from '../../../auth.service';
import { ZoneService } from "../../../zone.service";
import { AppVersionsService } from "../../../app-versions.service";
import { FormGroup, FormBuilder, AbstractControl, Validators, FormControl, ValidatorFn, ValidationErrors, FormGroupDirective } from '@angular/forms';
import { Zone } from '../../../model/zoneSchema';
import { of, forkJoin, Subscription, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';


export function copyJiraVaildate(
  control: AbstractControl
): { [key: string]: any } | null {

  const valid = /^[0-9a-zA-Z-]+$/.test(control.value);

  return valid
    ? null
    : { invalidNumber: { valid: false, value: control.value } }
}

@Component({
  selector: 'app-add-zone',
  templateUrl: './add-zone.component.html',
  styleUrls: ['./add-zone.component.scss']
})
export class AddZoneComponent implements OnInit {

  versionsDbSub: Subscription;
  versionsFsSub: Subscription;
  newZoneForm: FormGroup;
  zonePrefix: string;
  zonePrefixType: string;
  zoneType: string;
  formVaild: boolean = false;
  secondsSinceEpoch: number;
  exsisting_zone: string = 'Zone name in use, pleae update the name.';
  defaultDBVer: string;
  defaultAppVer: string;
  nextDBVer: string;
  nextAppVer: string;
  allDBVers: [];
  allAppVers: [];
  selectedSrcVer: string;
  allVers: [];
  zoneApiAddr: string = '/api/com.oracle.solaris.rad.zonemgr/1.6/Zone?_rad_detail';

  formErrors = {
    'updateJiraInput': '',
    'zoneDescription': ''
  };

  constructor(
    public dialogRef: MatDialogRef<AddZoneComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Zone,
    public zoneService: ZoneService,
    public appVersionsService: AppVersionsService,
    public globals: AppGlobals,
    private fb: FormBuilder,
    public _authService: AuthService,
    private toastrService: ToastrService,
  ) { }

  ngOnInit() {
    this.newZoneForm = this.fb.group({
      jiraTypes: new FormControl('APP-'),
      jiraID: new FormControl('', [Validators.required], this.zoneVaildate.bind(this)),
      updateJiraInput: new FormControl({ value: null, disabled: true }, [Validators.required, copyJiraVaildate]),
      updateJira: new FormControl(''),
      zoneDescription: new FormControl(''),
    });
    const now = new Date();
    this.secondsSinceEpoch = Math.round(now.getTime() / 1000);
    this.zoneType = 'APP-';
    this.zonePrefix = "z-" + this.secondsSinceEpoch + "-UNX-";
    this.zonePrefixType = 'UNX-';

    this.versionsDbSub = this.zoneService.getDbAppVerList(this.globals.baseUrl, 'DB')
      .subscribe(versions => {
        this.defaultDBVer = versions['results']['default'];
        this.nextDBVer = versions['results']['nextVer'];
        this.allDBVers = versions['results']['avaList'];
        this.allVers = this.allDBVers;
        this.selectedSrcVer = versions['results']['default'];
        this.zoneService!.getZoneList(
          this.globals.getEnvironment('baseUrl'),
          'zoneType',
          'db',
          'asc',
          '1',
          '10',
          this.globals.getEnvironment('dc1Hosts'),
          this.zoneApiAddr,
          versions['results']['default'].split('-')[2],
          'dbVer'
        ).subscribe(data => {
          if (data['message'][0]['message'][0]['zoneMaint'] === true) {
            this.toastrService.warning('The Database instance is in maintenance mode. <br><br>This means, you most likely will get a broken Database instance. <br><br>If so, you can always refresh your Database copy to fix the issue. <br><br>For additional details, please consult an administrator.', 'Please Note!!', {
              timeOut: 15000,
              positionClass: 'toast-bottom-right',
              enableHtml: true
            });
          }
        });
      });
    this.versionsFsSub = this.zoneService.getDbAppVerList(this.globals.baseUrl, 'FS')
      .subscribe(versions => {
        this.defaultAppVer = versions['results']['default'];
        this.nextAppVer = versions['results']['nextVer'];
        this.allAppVers = versions['results']['avaList'];
      });
  }

  changeValue() {
    this.newZoneForm.get('updateJira').valueChanges
      .subscribe(value => {
        if (value === true) {
          this.newZoneForm.controls['updateJiraInput'].enable();
        } else {
          this.newZoneForm.get('updateJiraInput').reset();
          this.newZoneForm.get('updateJiraInput').disable();
        }
      }
      );
  }

  zoneVaildate({ value }: AbstractControl): Promise<ValidationErrors | null> | Observable<ValidationErrors | null> {
    let lookupValue;
    if (this.zoneType === 'APP-') {
      lookupValue = 'UNX-' + value;
    } else {
      lookupValue = value;
    }
    return this.zoneService.verifyZoneName(this.globals.getEnvironment('baseUrl'), lookupValue)
      .pipe(
        map((zoneExists: any[]) => {
          if (zoneExists['zoneFound'] !== -1) {
            return {
              'exsisting_zone': true
            };
          }

          return null;
        })
      );
  }


  formControl = new FormControl('', [
    Validators.required
  ]);
  getErrorMessage() {
    return this.formControl.hasError('required') ? 'Required field' :
      this.formControl.hasError('email') ? 'Not a valid email' :
        '';
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  submit(): void {
    this.dialogRef.close();
  }

  createZone(zoneShortName: string, updateJira: boolean, jiraID: string, zoneDescription: string): void {

    let data = {
      "buildStatus": 'fa fa-spinner fa-pulse updating-icon',
      "zoneType": this.zoneType,
      "selectedSrcVer": this.selectedSrcVer,
      "zonePrefix": this.zonePrefix,
      "zoneName": this.zonePrefix + zoneShortName,
      "zoneShortName": this.zonePrefixType + zoneShortName,
      "zoneUser": this.globals.getCurrentUser(),
      "updateJira": updateJira,
      "jiraID": jiraID,
      "zoneDescription": zoneDescription,
    }

    this.dialogRef.close(data);
  }

  get jiraID(): any { return this.newZoneForm.get('jiraID'); }
  get zoneDescription(): any { return this.newZoneForm.get('zoneDescription'); }

  jiraTypeschange(change) {
    this.jiraID.reset();
    if (change.value === "Jira") {
      this.zoneType = 'APP-';
      this.zonePrefix = "z-" + this.secondsSinceEpoch + "-UNX-";
      this.zonePrefixType = 'UNX-';
      this.allVers = this.allDBVers;
      this.selectedSrcVer = this.defaultDBVer;
      this.newZoneForm.patchValue({ updateJira: false });
      this.newZoneForm.controls['updateJiraInput'].disable();
    } else if (change.value === "DB") {
      this.zoneType = 'DB-';
      this.zonePrefix = "z-db-v" + this.nextDBVer.split('-')[2] + '-' + this.secondsSinceEpoch + "-";
      this.allVers = this.allDBVers;
      this.selectedSrcVer = this.defaultDBVer;
      this.zonePrefixType = '';
      this.newZoneForm.patchValue({ updateJira: false });
    } else if (change.value === "FS") {
      this.zoneType = 'FS-';
      this.zonePrefix = "z-app-v" + this.nextAppVer.split('-')[2] + '-' + this.secondsSinceEpoch + "-";
      this.allVers = this.allAppVers;
      this.selectedSrcVer = this.defaultAppVer;
      this.zonePrefixType = '';
      this.newZoneForm.patchValue({ updateJira: false });
    } else if (change.value === "OTHER") {
      this.zoneType = 'OTHER-';
      this.zonePrefix = "z-" + this.secondsSinceEpoch + "-";
      this.allVers = this.allDBVers;
      this.selectedSrcVer = this.defaultDBVer;
      this.newZoneForm.patchValue({ updateJira: true });
      this.newZoneForm.controls['updateJiraInput'].enable();
      this.zonePrefixType = '';
    }
  }

  public confirmAdd(): void {
    this.zoneService.addZone(this.globals.getEnvironment('baseUrl'), this.data);
  }

  ngOnDestroy(): void {
    if (this.versionsFsSub) {
      this.versionsFsSub.unsubscribe();
    }
    if (this.versionsDbSub) {
      this.versionsDbSub.unsubscribe();
    }
  }

}

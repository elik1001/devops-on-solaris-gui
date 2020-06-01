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

@Component({
  selector: 'app-refresh-zone',
  templateUrl: './refresh-zone.component.html',
  styleUrls: ['./refresh-zone.component.scss']
})
export class RefreshZoneComponent implements OnInit {
  refreshZoneForm: FormGroup;
  versionsDbSub: Subscription;
  versionsFsSub: Subscription;
  defaultDBVer: string;
  defaultAppVer: string;
  nextDBVer: string;
  nextAppVer: string;
  allDBVers: [];
  allAppVers: [];
  selectedAppSrcVer: string;
  selectedDbSrcVer: string;
  // termsAndConditionsAccepted: boolean = false

  constructor(
    public dialogRef: MatDialogRef<RefreshZoneComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Zone,
    public zoneService: ZoneService,
    public appVersionsService: AppVersionsService,
    public globals: AppGlobals,
    private fb: FormBuilder,
    public _authService: AuthService
  ) { }

  ngOnInit() {
    this.refreshZoneForm = this.fb.group({
      refreshTypes: new FormControl('Both', [Validators.required]),
      selectedDbSrcVer: new FormControl('', [Validators.required]),
      selectedAppSrcVer: new FormControl('', [Validators.required]),
      acceptUpdate: new FormControl('', [Validators.required]),
    });

    this.versionsDbSub = this.zoneService.getDbAppVerList(this.globals.baseUrl, 'DB')
      .subscribe(versions => {
        this.allDBVers = versions['results']['avaList'];
        this.refreshZoneForm.patchValue({ selectedDbSrcVer: versions['results']['default'] });
      });
    this.versionsFsSub = this.zoneService.getDbAppVerList(this.globals.baseUrl, 'FS')
      .subscribe(versions => {
        this.allAppVers = versions['results']['avaList'];
        this.refreshZoneForm.patchValue({ selectedAppSrcVer: versions['results']['default'] });
      });
  }

  refreshTypesChange(change) {
    if (change.value === "Both") {
      this.refreshZoneForm.controls['selectedAppSrcVer'].enable();
      this.refreshZoneForm.controls['selectedDbSrcVer'].enable();
    } else if (change.value === "DB") {
      this.refreshZoneForm.get('selectedAppSrcVer').disable();
      this.refreshZoneForm.controls['selectedDbSrcVer'].enable();
    } else if (change.value === "FS") {
      this.refreshZoneForm.get('selectedDbSrcVer').disable();
      this.refreshZoneForm.controls['selectedAppSrcVer'].enable();
    }

  }
  /*isAccepted() {
    return this.termsAndConditionsAccepted;
  }*/
  onNoClick(): void {
    this.dialogRef.close();
  }

  submit(): void {
    this.dialogRef.close();
  }

  refreshApp(): void {
    const newData = {
      'buildStatus': 'fa fa-spinner fa-pulse updating-icon',
      'zoneUser': this.data.zoneUser,
      'zoneName': this.data.zoneName,
      'zoneShortName': this.data.zoneShortName,
      'zoneServer': this.data.zoneServer,
      'zonePort': this.data.zonePort,
      'refreshType': this.refreshZoneForm.value.refreshTypes,
      'selectedDbSrcVer': this.refreshZoneForm.value.selectedDbSrcVer,
      'selectedAppSrcVer': this.refreshZoneForm.value.selectedAppSrcVer,
      'dbVer': this.data.dbVer,
      'appsVer': this.data.appsVer,
    }
    this.dialogRef.close(newData);
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

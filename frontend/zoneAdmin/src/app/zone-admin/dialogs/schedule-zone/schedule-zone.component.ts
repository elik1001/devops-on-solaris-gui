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


@Component({
  selector: 'app-schedule-zone',
  templateUrl: './schedule-zone.component.html',
  styleUrls: ['./schedule-zone.component.scss']
})
export class ScheduleZoneComponent implements OnInit {
  updateSMFForm: FormGroup;
  selectedSMF: string;
  smfRefreshType: string;
  enableSvc: Boolean = true;
  disableSvc: Boolean = true;
  restartSvc: Boolean = true;
  clearSvc: Boolean = true;
  refreshSvc: Boolean = true;
  smfStatus: string = 'white';

  constructor(
    public dialogRef: MatDialogRef<ScheduleZoneComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Zone,
    public zoneService: ZoneService,
    public appVersionsService: AppVersionsService,
    public globals: AppGlobals,
    private fb: FormBuilder,
    private toastrService: ToastrService,
  ) { }

  ngOnInit() {
    this.updateSMFForm = this.fb.group({
      selectedSMF: new FormControl('', [Validators.required]),
      smfRefreshType: new FormControl('', [Validators.required]),
    });

  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  submit(): void {
    this.dialogRef.close();
  }

  selectedSMFChange(change) {
    const data = {
      'dcHost': this.data.zoneServer.split('-')[1],
      'zoneName': this.data.zoneName,
      'zoneShortName': this.data.zoneShortName,
      'zonePort': this.data.zonePort,
      'requestUri': '/api/com.oracle.solaris.rad.smf/1.0/Instance/',
      'smfInst': change.value,
      'methudAction': 'state',
    }

    this.zoneService.smfMaint(this.globals.getEnvironment('baseUrl'), data)
      .subscribe(results => {
        if (results[0]['msgResp'] === 'ONLINE') {
          this.smfStatus = '#3CB371';
          this.disableSvc = false;
          this.restartSvc = false;
          this.refreshSvc = false;
          this.clearSvc = true;
          this.enableSvc = true;
        } else if (results[0]['msgResp'] === 'DISABLED') {
          this.smfStatus = '#d2a2fc';
          this.enableSvc = false;
          this.refreshSvc = false;
          this.restartSvc = true;
          this.disableSvc = true;
          this.clearSvc = true;
        } else if (results[0]['msgResp'] === 'MAINT' || 'DEGRADED') {
          this.smfStatus = 'red';
          this.disableSvc = false;
          this.refreshSvc = false;
          this.clearSvc = false;
          this.restartSvc = true;
          this.enableSvc = true;
        } else if (results[0]['msgResp'] === 'OFFLINE') {
          this.smfStatus = '#f3be31';
          this.disableSvc = false;
          this.refreshSvc = false;
          this.clearSvc = false;
          this.restartSvc = true;
          this.enableSvc = true;
        } else {
          this.smfStatus = 'gray';
          this.disableSvc = true;
          this.restartSvc = true;
          this.clearSvc = true;
          this.enableSvc = true;
          this.refreshSvc = true;
        }
      });

  }

  updateSMF(): void {
    const data = {
      'dcHost': this.data.zoneServer.split('-')[1],
      'zoneName': this.data.zoneName,
      'zoneShortName': this.data.zoneShortName,
      'zonePort': this.data.zonePort,
      'requestUri': '/api/com.oracle.solaris.rad.smf/1.0/Instance/',
      'methudAction': 'state',
    }
    if ((this.updateSMFForm.value.smfRefreshType === 'disable' && this.updateSMFForm.value.selectedSMF === 'application%2Finformix_mount,ifxsrc')
      || (this.updateSMFForm.value.smfRefreshType === 'restart' && this.updateSMFForm.value.selectedSMF === 'application%2Finformix_mount,ifxsrc')) {
      data['smfInst'] = 'application%2Finformix_startup,ifxsrvr';
      this.zoneService.smfMaint(this.globals.getEnvironment('baseUrl'), data)
        .subscribe(results => {
          if (results[0]['msgResp'] === 'ONLINE') {
            this.updateSMFForm.reset();
            this.toastrService.warning('You first need to disable Informix before trying to un-mount /ifxsrv.', 'Stop! Stop! Stop!:', {
              timeOut: 8000,
              positionClass: 'toast-bottom-right',
              enableHtml: true
            });
          } else {
            data['smfInst'] = this.updateSMFForm.value.selectedSMF;
            data['methudAction'] = this.updateSMFForm.value.smfRefreshType;
            this.dialogRef.close(data);
          }
        });
    } else if (this.updateSMFForm.value.smfRefreshType === 'enable' && this.updateSMFForm.value.selectedSMF === 'application%2Finformix_startup,ifxsrvr') {
      data['smfInst'] = 'application%2Finformix_mount,ifxsrc';
      this.zoneService.smfMaint(this.globals.getEnvironment('baseUrl'), data)
        .subscribe(results => {
          if (results[0]['msgResp'] === 'OFFLINE' || results[0]['msgResp'] === 'MAINT' || results[0]['msgResp'] === 'DEGRADED' || results[0]['msgResp'] === 'DISABLED') {
            this.updateSMFForm.reset();
            this.toastrService.warning('You first need to mount the Informix file system (/ifxsrv) before staring Informix.', 'Stop! Stop! Stop!:', {
              timeOut: 8000,
              positionClass: 'toast-bottom-right',
              enableHtml: true
            });
          } else {
            data['smfInst'] = this.updateSMFForm.value.selectedSMF;
            data['methudAction'] = this.updateSMFForm.value.smfRefreshType;
            this.dialogRef.close(data);
          }
        });
    } else {
      data['smfInst'] = this.updateSMFForm.value.selectedSMF;
      data['methudAction'] = this.updateSMFForm.value.smfRefreshType;
      this.dialogRef.close(data);
    }

  }

  ngOnDestroy(): void {

  }


}

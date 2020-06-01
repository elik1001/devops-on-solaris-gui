import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { Component, Inject } from '@angular/core';
import { AppGlobals } from '../../../app.globals';
import { AuthService } from '../../../auth.service';
import { ZoneService } from "../../../zone.service";
import { FormControl, Validators } from '@angular/forms';

@Component({
  selector: 'app-edit-zone',
  templateUrl: './edit-zone.component.html',
  styleUrls: ['./edit-zone.component.scss']
})
export class EditZoneComponent {

  constructor(
    public dialogRef: MatDialogRef<EditZoneComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public zoneService: ZoneService,
    public globals: AppGlobals,
    public _authService: AuthService
  ) { }

  formControl = new FormControl('', [
    Validators.required
    // Validators.email,
  ]);

  getErrorMessage() {
    return this.formControl.hasError('required') ? 'Required field' :
      this.formControl.hasError('email') ? 'Not a valid email' :
        '';
  }

  submit() {
    // emppty stuff
  }


  onNoClick(): void {
    this.dialogRef.close();
  }

  stopEdit(): void {
    this.zoneService.updateZone(this.globals.getEnvironment('baseUrl'), this.data);
  }

}

import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { Component, Inject } from '@angular/core';
import { AppGlobals } from '../../../app.globals';
// import {DataService} from '../../services/data.service';
import { AppVersionsService } from "../../../app-versions.service";
import { FormControl, Validators } from '@angular/forms';

@Component({
  selector: 'app-edit-app-versions',
  templateUrl: './edit-app-versions.component.html',
  styleUrls: ['./edit-app-versions.component.scss']
})
export class EditAppVersionsComponent {

  constructor(
    public dialogRef: MatDialogRef<EditAppVersionsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public appVersionsService: AppVersionsService,
    public globals: AppGlobals,
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
    this.appVersionsService.updateApp(this.globals.getEnvironment('baseUrl'), this.data);
  }

}

import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { AppGlobals } from '../../../app.globals';
import { Component, Inject } from '@angular/core';
// import {DataService} from '../../services/data.service';
import { AppVersionsService } from "../../../app-versions.service";
import { FormControl, Validators } from '@angular/forms';
// import {Issue} from '../../models/issue';
import { AppVersions } from '../../../model/appVersionsSchema';

@Component({
  selector: 'app-add-app-versions',
  templateUrl: './add-app-versions.component.html',
  styleUrls: ['./add-app-versions.component.scss']
})
export class AddAppVersionsComponent {

  constructor(
    public dialogRef: MatDialogRef<AddAppVersionsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AppVersions,
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

  public confirmAdd(): void {
    this.appVersionsService.addApp(this.globals.getEnvironment('baseUrl'), this.data);
  }

}

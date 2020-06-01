import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { Component, Inject } from '@angular/core';
import { AppGlobals } from '../../../app.globals';
// import {DataService} from '../../services/data.service';
import { UpdateZoneJobsService } from "../../../update-zone-jobs.service";
import { FormControl, Validators } from '@angular/forms';

@Component({
  selector: 'app-edit-job',
  templateUrl: './edit-job.component.html',
  styleUrls: ['./edit-job.component.scss']
})
export class EditJobComponent {
  toggleChecked:boolean = false;
  //checked = false;

  constructor(
    public dialogRef: MatDialogRef<EditJobComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public updateZoneJobsService: UpdateZoneJobsService,
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

  editJob(_id): void {    
    const runData = {
      '_id': _id,
      'toggleChecked': this.toggleChecked
    }
    this.updateZoneJobsService.updateZoneJob(this.globals.getEnvironment('baseUrl'), runData);
  }

}

import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { Component, Inject } from '@angular/core';
import { AppGlobals } from '../../../app.globals';
import { UpdateZoneJobsService } from "../../../update-zone-jobs.service";


@Component({
  selector: 'app-delete-job',
  templateUrl: './delete-job.component.html',
  styleUrls: ['./delete-job.component.scss']
})
export class DeleteJobComponent {

    constructor(
      public dialogRef: MatDialogRef<DeleteJobComponent>,
      @Inject(MAT_DIALOG_DATA) public data: any,
      public updateZoneJobsService: UpdateZoneJobsService,
      public globals: AppGlobals,
    ) { }

    onNoClick(): void {
      this.dialogRef.close();
    }

    confirmDelete(): void {
      this.updateZoneJobsService.deleteZoneJob(this.globals.getEnvironment('baseUrl'), this.data._id);
    }

}

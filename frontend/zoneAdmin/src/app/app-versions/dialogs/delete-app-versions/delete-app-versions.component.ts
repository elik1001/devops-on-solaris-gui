import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { Component, Inject } from '@angular/core';
import { AppGlobals } from '../../../app.globals';
import { AppVersionsService } from "../../../app-versions.service";

@Component({
  selector: 'app-delete-app-versions',
  templateUrl: './delete-app-versions.component.html',
  styleUrls: ['./delete-app-versions.component.scss']
})
export class DeleteAppVersionsComponent {

  constructor(
    public dialogRef: MatDialogRef<DeleteAppVersionsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public appVersionsService: AppVersionsService,
    public globals: AppGlobals,
  ) { }

  onNoClick(): void {
    this.dialogRef.close();
  }

  confirmDelete(): void {
    this.appVersionsService.deleteApp(this.globals.getEnvironment('baseUrl'), this.data._id);
  }
}

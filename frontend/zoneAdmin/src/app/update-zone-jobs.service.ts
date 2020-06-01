import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
//import { Observable, of, Subject } from 'rxjs';
import { map, retry, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class UpdateZoneJobsService {

  result: any;
  dialogData: any;

  constructor(
    private http: HttpClient,
    private toastrService: ToastrService
  ) { }

  getZoneJobs(ipAddress) {
    return this.http.get(ipAddress + '/api/zoneJobs')
      .pipe(
        map(result => this.result = result)
      );
  }

  updateZoneJob(ipAddress, updateJob): void {    
    let headers = new HttpHeaders();
    this.http.put(ipAddress + '/api/zoneJobs/' + updateJob._id, updateJob, { headers: headers }).subscribe(data => {
      this.dialogData = updateJob;
      this.toastrService.success('Successfully edited', '', {
        timeOut: 3000,
        positionClass: 'toast-bottom-right',
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

  deleteZoneJob(ipAddress, id) {
    this.http.delete(ipAddress + '/api/zoneJobs/' + id).subscribe(data => {
      this.toastrService.success('Successfully deleted', '', {
        timeOut: 3000,
        positionClass: 'toast-bottom-right',
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

  getDialogData() {
    return this.dialogData;
  }

}

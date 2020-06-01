import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { Observable, of, Subject } from 'rxjs';
import { map, retry, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AppVersionsService {

  result: any;
  dialogData: any;

  constructor(private http: HttpClient, private toastrService: ToastrService) { }

  getAppList(ipAddress) {
    return this.http.get(ipAddress + '/api/appVersions')
      .pipe(
        map(result => this.result = result)
      );
  }

  getApp(ipAddress, id) {
    return this.http.get(ipAddress + '/api/appVersions/' + id)
      .pipe(
        map(result => this.result = result)
      );
  }

  addApp(ipAddress, newApp): void {
    let headers = new HttpHeaders();
    this.http.post(ipAddress + '/api/appVersions', newApp, { headers: headers })
      .subscribe(data => {
        this.dialogData = newApp;
        this.toastrService.success('Successfully added', '', {
          timeOut: 3000,
          positionClass: 'toast-bottom-right',
        });
      },
        (err: HttpErrorResponse) => {
          this.toastrService.error('Error occurred. Details: ' + err.name + ' ' + err.message, 'Major Error', {
            timeOut: 8000,
            positionClass: 'toast-bottom-center',
          });
        });
  }


  deleteApp(ipAddress, id): void {
    this.http.delete(ipAddress + '/api/appVersions/' + id).subscribe(data => {
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

  updateApp(ipAddress, newApp): void {
    let headers = new HttpHeaders();
    this.http.put(ipAddress + '/api/appVersions/' + newApp._id, newApp, { headers: headers }).subscribe(data => {
      this.dialogData = newApp;
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

  getDialogData() {
    return this.dialogData;
  }

}

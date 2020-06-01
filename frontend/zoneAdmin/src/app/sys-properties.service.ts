import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { Observable, of, Subject } from 'rxjs';
import { map, retry, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class SysPropertiesService {
  result: any;
  // dialogData: any;

  constructor(private http: HttpClient, private toastrService: ToastrService) { }

  getSystemProps(ipAddress) {
    return this.http.get(ipAddress + '/api/systemProperties')
      .pipe(
        map(result => this.result = result)
      );
  }

  updateSystemProp(ipAddress, newProp) {
    let headers = new HttpHeaders();
    return this.http.put(ipAddress + '/api/systemProperties/systemProp', newProp, { headers: headers })
      .pipe(
        map(result => this.result = result)
      );
  }

  deleteSystemProp(ipAddress): void {
    this.http.delete(ipAddress + '/api/systemProperties/systemProp').subscribe(data => {
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

  /*getDialogData() {
    return this.dialogData;
  }*/

}

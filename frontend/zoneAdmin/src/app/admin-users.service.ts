import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { Observable, of, Subject } from 'rxjs';
import { map, retry, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AdminUsersService {

  result: any;
  dialogData: any;

  constructor(private http: HttpClient, private toastrService: ToastrService) { }

  getUserList(ipAddress) {
    return this.http.get(ipAddress + '/api/users')
      .pipe(
        map(result => this.result = result)
      );
  }

  getUser(ipAddress, id) {
    return this.http.get(ipAddress + '/api/users/' + id)
      .pipe(
        map(result => this.result = result)
      );
  }

  addUser(ipAddress, newUser): void {
    let headers = new HttpHeaders();
    this.http.post(ipAddress + '/api/users', newUser, { headers: headers })
      .subscribe(data => {
        this.dialogData = newUser;
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


  deleteUser(ipAddress, id): void {
    this.http.delete(ipAddress + '/api/users/' + id).subscribe(data => {
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

  updateUser(ipAddress, newUser): void {
    let headers = new HttpHeaders();
    this.http.put(ipAddress + '/api/users/' + newUser._id, newUser, { headers: headers }).subscribe(data => {
      this.dialogData = newUser;
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

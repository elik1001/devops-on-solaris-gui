import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse, HttpHeaders, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';

import { Observable, interval, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ZoneService {

  result: any;

  constructor(private http: HttpClient, private toastrService: ToastrService) { }

  refreshToken(ipAddress) {
    return this.http.get(ipAddress + '/api/updateToken')
      .pipe(
        map(result => this.result = result)
      );
  }

  VerifyUserDir(ipAddress, dirId) {
    return this.http.get(ipAddress + '/api/fsExists/' + dirId);
  }


  getHREmployee(ipAddress, id) {
    // console.log(ipAddress + '/api/hruser/' + id);
    return this.http.get(ipAddress + '/api/hruser/' + id)
      .pipe(
        map(result => this.result = result)
      );
  }

  getEmployeeID(ipAddress, newEmployeeID) {
    let headers = new HttpHeaders();
    return this.http.put(ipAddress + '/api/employeType/' + newEmployeeID.employeCode, newEmployeeID, { headers: headers })
      .pipe(
        map(result => this.result = result)
      )

    /*.subscribe(data => {
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
    );*/
  }

  getHrGrups(ipAddress, filter, pageNumber, pageSize) {
    const data = {
      //'sortField': sortField,
      'filter': filter,
      'sortOrder': 'asc',
      'pageNumber': pageNumber,
      'pageSize': pageSize,
    }
    // console.log(filter);
    return this.http.get(ipAddress + '/api/hrgroups/', { params: data })
      .pipe(
        map(result => this.result = result)
      );
  }


  addEmployee(ipAddress, newEmployee) {
    let headers = new HttpHeaders();
    return this.http.post(ipAddress + '/api/ldap/' + newEmployee.employee_number, newEmployee, { headers: headers })
      .pipe(
        map(result => this.result = result)
      );
  }

  addEmployeeToTable(ipAddress, newEmployee) {
    let headers = new HttpHeaders();
    return this.http.post(ipAddress + '/api/employee', newEmployee, { headers: headers })
      .pipe(
        map(result => this.result = result)
      );
  }

  lookupAdUser(ipAddress, id, adserver) {
    const data = {
      'adserver': adserver,
      'lookupName': 'sAMAccountName',
    }
    return this.http.get(ipAddress + '/api/aduser/' + id, { params: data })
      .pipe(
        map(result => this.result = result)
      );
  }

  verifyAdUser(ipAddress, id, adserver, enableAccount) {
    const data = {
      'adserver': adserver,
      'lookupName': 'sAMAccountName',
      'enableAccount': enableAccount
    }
    return this.http.get(ipAddress + '/api/aduser/' + id, { params: data })
      .pipe(
        map(result => this.result = result)
      );
  }

  verifyLdapUser(ipAddress, id, adserver, lookupName, enableAccount) {
    const data = {
      'adserver': adserver,
      'lookupName': lookupName,
      'enableAccount': enableAccount
    }
    return this.http.get(ipAddress + '/api/aduser/' + id, { params: data })
      .pipe(
        map(result => this.result = result)
      );
  }

  updateAdUser(ipAddress, id, data) {
    // console.log(ipAddress + '/api/hruser/' + id);
    let headers = new HttpHeaders();
    return this.http.post(ipAddress + '/api/updateAduser/' + id, data, { headers: headers })
      .pipe(
        map(result => this.result = result)
      );
  }

  createUserFS(ipAddress, id, data) {
    let headers = new HttpHeaders();
    return this.http.post(ipAddress + '/api/createUserFS/' + id, data, { headers: headers })
      .pipe(
        map(result => this.result = result)
      );
  }

  sendEmail(ipAddress, id, data) {
    let headers = new HttpHeaders();
    return this.http.post(ipAddress + '/api/emailInfo/' + id, data, { headers: headers })
      .pipe(
        map(result => this.result = result)
      );
  }

  setSalsMan(ipAddress, id, data) {
    let headers = new HttpHeaders();
    return this.http.post(ipAddress + '/api/slsCode/' + id, data, { headers: headers })
      .pipe(
        map(result => this.result = result)
      );
  }

  remoteCommend(ipAddress, id, data) {
    let headers = new HttpHeaders();
    return this.http.post(ipAddress + '/api/runRemoteCmd/' + id, data, { headers: headers })
      .pipe(
        map(result => this.result = result)
      );
  }

  ldapModUpdate(ipAddress, id, data) {
    let headers = new HttpHeaders();
    return this.http.post(ipAddress + '/api/ldapUpdate/' + id, data, { headers: headers })
      .pipe(
        map(result => this.result = result)
      );
  }

}

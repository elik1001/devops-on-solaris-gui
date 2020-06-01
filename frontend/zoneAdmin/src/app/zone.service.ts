import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse, HttpHeaders, HttpErrorResponse, HttpParams } from '@angular/common/http';
// import 'rxjs/add/operator/map';
import { ToastrService } from 'ngx-toastr';
import { Observable, of, Subject } from 'rxjs';
import { map } from 'rxjs/operators';


@Injectable({
  providedIn: 'root'
})
export class ZoneService {

  result: any;
  dialogData: any;

  constructor(private http: HttpClient, private toastrService: ToastrService) { }

  refreshToken(ipAddress) {
    let headers = new HttpHeaders();
    return this.http.post(ipAddress + '/api/updateToken', { headers: headers })
      .pipe(
        map(result => this.result = result)
      );
  }

  getZoneList(ipAddress, sortField, filter, sortOrder, pageNumber, pageSize, dcHosts: string[], apiCommend: string, loggedInUser, searchField: string) {
    const data = {
      'sortField': sortField,
      'filter': filter,
      'sortOrder': sortOrder,
      'pageNumber': pageNumber,
      'pageSize': pageSize,
      'dcHosts': dcHosts,
      'apiCommend': apiCommend,
      'loggedInUser': loggedInUser,
      'searchField': searchField,
    }
    return this.http.get(ipAddress + '/api/zones/getZones', { params: data })
      .pipe(
        map(result => this.result = result)
      );
  }

  getZoneStat(ipAddress) {
    return this.http.get(ipAddress + '/api/zones/getZoneStats')
      .pipe(
        map(result => this.result = result)
      );
  }

  verifyZoneName(ipAddress, zoneID) {
    return this.http.get(ipAddress + '/api/zones/verifyZone/' + zoneID)
      .pipe(
        map(result => this.result = result)
      );
  }

  addZone(ipAddress, newZone) {
    let headers = new HttpHeaders();
    // Orignal
    //return this.http.post(ipAddress + '/api/zones/createZone/' + newZone.zoneName, newZone, { headers: headers })
    // New
    return this.http.post(ipAddress + '/api/zones/createDualZone/' + newZone.zoneName, newZone, { headers: headers })
      .pipe(
        map(result => this.result = result)
      );
  }

  refreshZone(ipAddress, zone) {
    let headers = new HttpHeaders();
    return this.http.post(ipAddress + '/api/zones/refreshZone/' + zone.zoneName, zone, { headers: headers })
      .pipe(
        map(result => this.result = result)
      );
  }

  uninstallDeleteZoneCfg(ipAddress, data) {
    let headers = new HttpHeaders();
    return this.http.put(ipAddress + '/api/zones/zoneMaintenance/' + data.zoneName, data, { headers: headers, params: data })
      .pipe(
        map(result => this.result = result)
      );
  }

  smfMaint(ipAddress, data) {
    let headers = new HttpHeaders();
    return this.http.put(ipAddress + '/api/zones/smfMaint', data, { headers: headers, params: data })
      .pipe(
        map(result => this.result = result)
      );
  }

  updateZone(ipAddress, zoneInfo): void {
    let headers = new HttpHeaders();
    this.http.put(ipAddress + '/api/zones/updateZoneInfo/' + zoneInfo.zoneName, zoneInfo, { headers: headers }).subscribe(data => {
      this.dialogData = zoneInfo;
      this.toastrService.success('Successfully edited', '', {
        timeOut: 3000,
        positionClass: 'toast-bottom-center',
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

  getZoneByID(ipAddress, id) {
    return this.http.get(ipAddress + '/api/empid/' + id);
  }

  getJiraDisc(ipAddress: string, data) {
    return this.http.get(ipAddress + '/api/zones/getJiraDisc/', { params: data });
  }

  getDbAppVerList(ipAddress: string, type) {
    // let headers = new HttpHeaders();
    return this.http.get(ipAddress + '/api/zones/getDbAppVers/' + type)
      .pipe(
        map(result => this.result = result)
      );
  }

  getZfsSnapList(ipAddress: string, data) {
    let headers = new HttpHeaders();
    return this.http.get(ipAddress + '/api/runZfsActions', { params: data })
      .pipe(
        map(result => this.result = result)
      );
  }

  getDialogData() {
    return this.dialogData;
  }

}

// specfic employee
// "https://usr55-services.dayforcehcm.com/Api/bav/V1/Employees/06789"

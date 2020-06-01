import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { Component, Inject, OnInit } from '@angular/core';
import { AppGlobals } from '../../../app.globals';
import { ZoneService } from "../../../zone.service";
import { of, forkJoin, Subscription } from 'rxjs';

@Component({
  selector: 'app-delete-zone',
  templateUrl: './delete-zone.component.html',
  styleUrls: ['./delete-zone.component.scss']
})
export class DeleteZoneComponent implements OnInit {
  deleteZfsSnapsSub: Subscription;
  dbAssociatedSnaps: number;
  appAssociatedSnaps: number;
  delAppAssociatedSnaps: number = 0;
  delDbAssociatedSnaps: number = 0;
  dbAssociatedSnapList: any[];
  appAssociatedSnapList: any[];
  dbAssociatedSnapIcon: string = 'fa fa-minus neutral-icon';
  appAssociatedSnapIcon: string = 'fa fa-minus neutral-icon';
  delAssociatedSnapIcon: string = 'fa fa-minus pause-icon';
  showDbWarning: boolean = false;
  showAppWarning: boolean = false;

  formVaild: boolean = false;
  zoneHalt: any = [
    {
      'haltRemoteHost': 'DC1',
      'haltErrResult': 'Working... please wait..',
      'haltActionResultsIcon': 'fa fa-minus pause-icon',
      'haltOperation': ' Halt'
    },
    {
      'haltRemoteHost': 'DC2',
      'haltErrResult': 'Working... please wait..',
      'haltActionResultsIcon': 'fa fa-minus pause-icon',
      'haltOperation': ' Halt'
    }
  ]
  zoneUnistl: any = [
    {
      'unstlRemoteHost': 'DC1',
      'unstlErrResult': 'Working... please wait..',
      'unstlActionResultsIcon': 'fa fa-minus pause-icon',
      'unstlOperation': ' Uninstall',
    },
    {
      'unstlRemoteHost': 'DC2',
      'unstlErrResult': 'Working... please wait..',
      'unstlActionResultsIcon': 'fa fa-minus pause-icon',
      'unstlOperation': ' Uninstall',
    }
  ]
  deleteZoneConfigProp: any = [
    {
      'delRemoteHost': 'DC1',
      'delErrResult': 'Working... please wait..',
      'delActionResultsIcon': 'fa fa-minus pause-icon',
      'delOperation': ' Delete',
    },
    {
      'delRemoteHost': 'DC2',
      'delErrResult': 'Working... please wait..',
      'delActionResultsIcon': 'fa fa-minus pause-icon',
      'delOperation': ' Delete',
    }
  ]
  isSubmitted: boolean = false;
  cancelBtnValue: string = 'Cancel';
  sources = [];

  constructor(
    public dialogRef: MatDialogRef<DeleteZoneComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public zoneService: ZoneService,
    public globals: AppGlobals,

  ) { }

  onCancel(value) {
    if (value === "Cancel") {
      this.dialogRef.close();
    } else {
      this.dialogRef.close('refresh');
    }
  }

  haltZone() {
    return new Promise(resolve => {

      const data = {
        '_id': this.data._id,
        'dcHost': this.data.zoneServer.split('-')[1],
        'zoneName': this.data.zoneName,
        'zoneShortName': this.data.zoneShortName,
        'zoneUser': this.data.zoneUser,
        'zfsApiType': 'PUT',
        'zfsSrcFs': 'apps1-prod_v-' + '3',
        'zfsSrcSnap': '',
        'requestUri': '/api/com.oracle.solaris.rad.zonemgr/1.6/Zone/' + this.data.zoneName,
        'methudAction': 'halt',
        'reqBody': {},
        'jiraID': this.data.jiraID
      }

      this.zoneHalt[0]['haltActionResultsIcon'] = 'fa fa-spinner fa-pulse updating-icon';
      this.zoneHalt[1]['haltActionResultsIcon'] = 'fa fa-spinner fa-pulse updating-icon';
      this.zoneService.uninstallDeleteZoneCfg(this.globals.getEnvironment('baseUrl'), data)
        .subscribe(haltRes => {
          this.zoneHalt.splice(0);
          haltRes['message'].forEach(
            element => {
              this.zoneHalt['haltOperation'] = 'Halt';
              if (element['errResult'] === false) {
                if (element['msgResp']['stderr'] === null) {
                  let dcStat = {
                    'haltRemoteHost': element['remoteHost'].split('/').join(':').split('-').join(':').split(':')[3],
                    'haltErrResult': 'success',
                    'haltActionResultsIcon': 'fa fa-check positive-icon',
                    'haltOperation': ' Halt',
                  }
                  this.zoneHalt.push(dcStat);
                  if (this.zoneHalt.length === 2) {
                    resolve(data);
                  }
                } else {
                  let dcStat = {
                    'haltRemoteHost': element['remoteHost'].split('/').join(':').split('-').join(':').split(':')[3],
                    'haltErrResult': element['msgResp']['stderr'],
                    'haltActionResultsIcon': 'fa fa-circle neutral-icon',
                    'haltOperation': ' Halt',
                  }
                  this.zoneHalt.push(dcStat);
                  if (this.zoneHalt.length === 2) {
                    resolve(data);
                  }
                }
              } else {
                let dcStat = {
                  'haltRemoteHost': element['remoteHost'].split('/').join(':').split('-').join(':').split(':')[3],
                  'haltErrResult': element['msgResp']['stderr'],
                  'haltActionResultsIcon': 'fa fa-times negative-icon',
                  'haltOperation': ' Halt',
                }
                this.zoneHalt.push(dcStat);
                if (this.zoneHalt.length === 2) {
                  resolve(data);
                }
              }
            });
        });
    });
  }

  uninstallZone(data) {
    return new Promise(resolve => {
      /*const data = {
        'dcHost': this.data.zoneServer.split('-')[1],
        'zoneName': this.data.zoneName,
        'zfsApiType': 'PUT',
        'zfsSrcFs': 'apps1-prod_v-' + '3',
        'zfsSrcSnap': '',
        'requestUri': '/api/com.oracle.solaris.rad.zonemgr/1.6/Zone/',
        'methudAction': 'halt',
        'reqBody': ''
      }*/
      this.zoneUnistl[0]['unstlActionResultsIcon'] = 'fa fa-spinner fa-pulse updating-icon';
      this.zoneUnistl[1]['unstlActionResultsIcon'] = 'fa fa-spinner fa-pulse updating-icon';
      this.zoneService.uninstallDeleteZoneCfg(this.globals.getEnvironment('baseUrl'), data)
        .subscribe(unstlRes => {
          this.zoneUnistl.splice(0);
          unstlRes['message'].forEach(
            element => {
              this.zoneUnistl['unstlOperation'] = 'Uninstall';
              if (element['errResult'] === false) {
                if (element['msgResp']['stderr'] === null) {
                  let dcStat = {
                    'unstlRemoteHost': element['remoteHost'].split('/').join(':').split('-').join(':').split(':')[3],
                    'unstlErrResult': 'success',
                    'unstlActionResultsIcon': 'fa fa-check positive-icon',
                    'unstlOperation': ' Uninstall',
                  }
                  this.zoneUnistl.push(dcStat);
                  //console.log(this.zoneUnistl.length);
                  if (this.zoneUnistl.length === 2) {
                    resolve(data);
                  }
                } else {
                  let dcStat = {
                    'unstlRemoteHost': element['remoteHost'].split('/').join(':').split('-').join(':').split(':')[3],
                    'unstlErrResult': element['msgResp']['stderr'],
                    'unstlActionResultsIcon': 'fa fa-circle neutral-icon',
                    'unstlOperation': ' Uninstall',
                  }
                  this.zoneUnistl.push(dcStat);
                  //console.log(this.zoneUnistl.length);
                  if (this.zoneUnistl.length === 2) {
                    resolve(data);
                  }
                }
              } else {
                let dcStat = {
                  'unstlRemoteHost': element['remoteHost'].split('/').join(':').split('-').join(':').split(':')[3],
                  'unstlErrResult': element['msgResp']['stderr'],
                  'unstlActionResultsIcon': 'fa fa-times negative-icon',
                  'unstlOperation': ' Uninstall',
                }
                this.zoneUnistl.push(dcStat);
                //console.log(this.zoneUnistl.length);
                if (this.zoneUnistl.length === 2) {
                  resolve(data);
                }
              }
            });
        });
    });
  }

  deleteZoneConfig(data) {
    return new Promise(resolve => {
      this.deleteZoneConfigProp[0]['delActionResultsIcon'] = 'fa fa-spinner fa-pulse updating-icon';
      this.deleteZoneConfigProp[1]['delActionResultsIcon'] = 'fa fa-spinner fa-pulse updating-icon';
      this.zoneService.uninstallDeleteZoneCfg(this.globals.getEnvironment('baseUrl'), data)
        .subscribe(deleteRes => {
          this.deleteZoneConfigProp.splice(0);
          deleteRes['message'].forEach(
            element => {
              this.deleteZoneConfigProp['delOperation'] = 'Delete';
              if (element['errResult'] === false) {
                if (element['msgResp']['stderr'] === null) {
                  let dcStat = {
                    'delRemoteHost': element['remoteHost'].split('/').join(':').split('-').join(':').split(':')[3],
                    'delErrResult': 'success',
                    'delActionResultsIcon': 'fa fa-check positive-icon',
                    'delOperation': ' Delete',
                  }
                  this.deleteZoneConfigProp.push(dcStat);
                  //console.log(this.deleteZoneConfigProp.length);
                  if (this.deleteZoneConfigProp.length === 2) {
                    resolve(data);
                  }
                } else {
                  let dcStat = {
                    'delRemoteHost': element['remoteHost'].split('/').join(':').split('-').join(':').split(':')[3],
                    'delErrResult': element['msgResp']['stderr'],
                    'delActionResultsIcon': 'fa fa-circle neutral-icon',
                    'delOperation': ' Delete',
                  }
                  this.deleteZoneConfigProp.push(dcStat);
                  //console.log(this.deleteZoneConfigProp.length);
                  if (this.deleteZoneConfigProp.length === 2) {
                    resolve(data);
                  }
                }
              } else {
                let dcStat = {
                  'delRemoteHost': element['remoteHost'].split('/').join(':').split('-').join(':').split(':')[3],
                  'delErrResult': element['msgResp']['stderr'],
                  'delActionResultsIcon': 'fa fa-times negative-icon',
                  'delOperation': ' Delete',
                }
                this.deleteZoneConfigProp.push(dcStat);
                //console.log(this.deleteZoneConfigProp.length);
                if (this.deleteZoneConfigProp.length === 2) {
                  resolve(data);
                }
              }
            });
        });
    });
  }

  confirmDelete(submitBtn: HTMLButtonElement, cancelBtn: HTMLButtonElement) {
    this.isSubmitted = true;
    submitBtn.disabled = true;
    cancelBtn.disabled = true;
    this.sources.splice(0);

    this.haltZone().then(haltRes => {
      let data = haltRes;
      data['methudAction'] = 'uninstall';
      data['reqBody'] = { 'options': ['-F'] };
      //console.log(data);

      this.uninstallZone(data).then(uninstlRes => {
        let data = uninstlRes;
        data['methudAction'] = 'delete';
        data['reqBody'] = { 'name': data['zoneName'] };
        data['requestUri'] = '/api/com.oracle.solaris.rad.zonemgr/1.6/ZoneManager',
          //console.log(data);

          this.deleteZoneConfig(data).then(deleteZnCfg => {
            this.delAssociatedSnapIcon = 'fa fa-spinner fa-pulse updating-icon';
            let ifxSrcSnap = "ifxdb-do_v-" + this.data.dbVer;
            let appSrcSnap = "apps1-prod_v-" + this.data.appsVer;
            let deleteType;
            if (this.appAssociatedSnapList.length > 0) {
              if (this.data.zoneType === 'FS') {
                deleteType = 'deleteFilesystem';
              } else {
                deleteType = 'deleteSnapClone';
              }
              if (this.appAssociatedSnapList.length > 0) {
                this.appAssociatedSnapList.forEach(
                  element => {
                    const appData = {
                      'zfsApiType': 'DELETE',
                      'zfsReqType': deleteType,
                      'zoneName': this.data.zoneName,
                      'zfsSrcFs': appSrcSnap,
                      'zfsSrcSnap': element,
                    }
                    this.sources.push(this.zoneService.getZfsSnapList(this.globals.getEnvironment('baseUrl'), appData));
                  });
              }
            }

            if (this.dbAssociatedSnapList.length > 0) {
              if (this.data.zoneType === 'DB') {
                deleteType = 'deleteFilesystem';
              } else {
                deleteType = 'deleteSnapClone';
              }
              this.dbAssociatedSnapList.forEach(
                element => {
                  const appData = {
                    'zfsApiType': 'DELETE',
                    'zfsReqType': deleteType,
                    'zoneName': this.data.zoneName,
                    'zfsSrcFs': ifxSrcSnap,
                    'zfsSrcSnap': element,
                  }
                  this.sources.push(this.zoneService.getZfsSnapList(this.globals.getEnvironment('baseUrl'), appData));
                });
            }

            if (this.sources.length > 0) {
              this.deleteZfsSnapsSub = forkJoin(this.sources)
                .subscribe(data => {
                  if (data === null) {
                  } else {
                    if (data.length > 0) {
                      data.forEach(
                        item => {
                          if (item['zfsSrcFs'].startsWith('apps1-prod_v-') && item['retCode'] === 204) {
                            this.delAppAssociatedSnaps++;
                          } else if (item['zfsSrcFs'].startsWith('ifxdb-do_v-') && item['retCode'] === 204) {
                            this.delDbAssociatedSnaps++;
                          }
                        });
                    }
                  }

                  if (this.delAppAssociatedSnaps === this.appAssociatedSnaps && this.delDbAssociatedSnaps === this.dbAssociatedSnaps) {
                    this.delAssociatedSnapIcon = 'fa fa-check positive-icon';
                  } else if ((this.delAppAssociatedSnaps < this.appAssociatedSnaps) && (this.delDbAssociatedSnaps === this.dbAssociatedSnaps) ||
                    (this.delAppAssociatedSnaps === this.appAssociatedSnaps) && (this.delDbAssociatedSnaps < this.dbAssociatedSnaps)) {
                    if (deleteType === 'deleteFilesystem') {
                      this.delAssociatedSnapIcon = 'fa fa-check positive-icon';
                    } else {
                      this.delAssociatedSnapIcon = 'fa fa-circle neutral-icon';
                    }
                  } else {
                    this.delAssociatedSnapIcon = 'fa fa-times negative-icon';
                  }

                  this.cancelBtnValue = 'Close';
                  cancelBtn.disabled = false;
                });
            } else {
              this.delAssociatedSnapIcon = 'fa fa-circle positive-icon';
              this.cancelBtnValue = 'Close';
              cancelBtn.disabled = false;
            }
          });
      });

    });
  }

  ngOnInit() {

    const appData = {
      'zfsApiType': 'GET',
      'zfsReqType': 'getSnaps',
      'zoneName': this.data.zoneName,
      'zoneType': this.data.zoneType,
      'zfsSrcFs': 'apps1-prod_v-' + this.data.appsVer,
      'zfsSrcSnap': '',
      'appVersions': this.data.appVersions,
    }
    this.appAssociatedSnapIcon = 'fa fa-spinner fa-pulse updating-icon';
    this.zoneService.getZfsSnapList(this.globals.getEnvironment('baseUrl'), appData)
      .subscribe(result => {
        //console.log(result);
        if (result['error'] === false) {
          if (result['snapCount'] === 0) {
            this.appAssociatedSnapIcon = "fa fa-circle neutral-icon";

            if (this.data.zoneType === 'FS') {
              this.appAssociatedSnaps = 1;
              this.appAssociatedSnapList = [result['zfsSrcFs']];
              this.appAssociatedSnapIcon = 'fa fa-check positive-icon';
              if (result['zfsSrcFs'].split('-')[2] !== this.data.zoneName.split('-')[2].slice(1)) {
                this.showAppWarning = true;
              }
            } else {
              this.appAssociatedSnaps = result['snapCount'];
              this.appAssociatedSnapList = result['snapList'];
            }
            this.formVaild = true;
          } else {
            this.appAssociatedSnapIcon = 'fa fa-check positive-icon';
            if (this.data.zoneType === 'FS') {
              if (result['snapCount'] === 0) {
                this.appAssociatedSnaps = 1;
              } else {
                this.appAssociatedSnaps = result['snapCount'];
              }
              this.appAssociatedSnapList = [result['zfsSrcFs']];
              if (result['zfsSrcFs'].split('-')[2] !== this.data.zoneName.split('-')[2].slice(1)) {
                this.showAppWarning = true;
              }
            } else {
              this.appAssociatedSnaps = result['snapCount'];
              this.appAssociatedSnapList = result['snapList'];
            }
            this.formVaild = true;
          }
        } else {
          this.appAssociatedSnaps = result['snapCount'];
          if (typeof result['snapList'] === 'string' && result['snapList'] === 'None') {
            this.appAssociatedSnapList = [];
          } else {            
            this.appAssociatedSnapList = result['snapList'];
          }
          this.appAssociatedSnapIcon = 'fa fa-times negative-icon';
          this.formVaild = false;
        }
      });
    const dbData = {
      'zfsApiType': 'GET',
      'zfsReqType': 'getSnaps',
      'zoneName': this.data.zoneName,
      'zoneType': this.data.zoneType,
      'zfsSrcFs': 'ifxdb-do_v-' + this.data.dbVer,
      'zfsSrcSnap': '',
      'dbVersions': this.data.dbVersions,
    }
    this.dbAssociatedSnapIcon = 'fa fa-spinner fa-pulse updating-icon';
    this.zoneService.getZfsSnapList(this.globals.getEnvironment('baseUrl'), dbData)
      .subscribe((result: []) => {

        if (result['error'] === false) {
          if (result['snapCount'] === 0) {
            this.dbAssociatedSnapIcon = "fa fa-circle neutral-icon";
            if (this.data.zoneType === 'DB') {
              this.dbAssociatedSnaps = 1;
              this.dbAssociatedSnapList = [result['zfsSrcFs']];
              this.dbAssociatedSnapIcon = 'fa fa-check positive-icon';
              if (result['zfsSrcFs'].split('-')[2] !== this.data.zoneName.split('-')[2].slice(1)) {
                this.showDbWarning = true;
              }
            } else {
              this.dbAssociatedSnaps = result['snapCount'];
              this.dbAssociatedSnapList = result['snapList'];
            }
            this.formVaild = true;
          } else {
            this.dbAssociatedSnapIcon = 'fa fa-check positive-icon';
            if (this.data.zoneType === 'DB') {
              if (result['snapCount'] === 0) {
                this.dbAssociatedSnaps = 1;
              } else {
                this.dbAssociatedSnaps = result['snapCount'];
              }
              this.dbAssociatedSnapList = [result['zfsSrcFs']];
              if (result['zfsSrcFs'].split('-')[2] !== this.data.zoneName.split('-')[2].slice(1)) {
                this.showDbWarning = true;
              }
            } else {
              this.dbAssociatedSnaps = result['snapCount'];
              this.dbAssociatedSnapList = result['snapList'];
            }
            this.formVaild = true;
          }
        } else {
          this.dbAssociatedSnaps = result['snapCount'];
          if (typeof result['snapList'] === 'string' && result['snapList'] === 'None') {
            this.dbAssociatedSnapList = [];
          } else {
            this.dbAssociatedSnapList = result['snapList'];
          }
          this.dbAssociatedSnapIcon = 'fa fa-times negative-icon';
          this.formVaild = false;
        }

      });
  }

  isFormValid(): boolean {
    return this.formVaild ? true : false
  }

}

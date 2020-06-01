export class Zone {
  _id?: String;
  id: Number;
  zoneLock?: String;
  zonePort: Number;
  zoneUser: String;
  zoneType: String;
  zoneShortName?: String;
  activeSchema: boolean;
  zoneName: String;
  zoneServer: String;
  zoneActive: String;
  zoneAddress: String;
  buildStatus: String;
  buildMsg: String;
  jiraID?: String;
  updateJira: Boolean;
  dbVer?: Number;
  appsVer?: Number;
  appVersions?: [String];
  dbVersions?: [String];
  zoneDescription?: String;
  zoneMaint?: Boolean;
  percentComplete?: Number;
}

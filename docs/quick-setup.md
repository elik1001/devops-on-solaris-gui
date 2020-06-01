<h3>Getting Started</h3>

<h4>Installation</h4>
<h4>Dependencies / Prerequisites</h4>
<b>The following are required and used:</b>
<pre>
Angular (8+)
NodeJs (12+)
MongoDB (4.x+)
ZFSSA
</pre>

<h4>Application Details</h4>
<h5>Application Directory Structure</h5>

The directory layout are explained below.

<ol>
<li></li>
<li><b>backend: </b>All backend code (NodeJS) are in this directory.</li>
<li><b>frontend/zoneAdmin: </b>All frontend code (Angular) are in this directory.</li>
<li><b>docs: </b>Application documentation.</li>
<li><b>images: </b>Images related to the application</li>
</ol>

First, download/clone the repository to your local host by running.
<pre>
git clone https://github.com/elik1001/devops-on-solaris-gui
</pre>
<ol>

<li>Find a place on you local host to store and work with the application.<li>
<li>Make sure to install NodeJS, you can download from here https://nodejs.org/en/download</li>
<li>Make sure to configure a Mongo DB (local or remote)</li>
<li>Create an env.env file, more details are below.</li>
</ol>


<h4>Solaris Global Server Host Names</h4>

The Application assumes that we are running multiple servers per data center(for HA) minimum 1,, as well as in a multi data center configuration for DR purposes.

For the current version, when creating/cloning a zone (any type db,app,fs), the system will look for a zone called <b>z-source</b> as the source zone, you will have to pre  created such zone on each Solaris Global server, otherwise installation will fail.

On the ZFSSA appliance we are looking for two file systems:
You shuld have one DB file system <i>ifxdb-do_v-</i><b>1</b> (the 1 is your starting version umber).
You shuld have one APPS file system <i>apps1-prod_v-</i><b>1</b> (the 1 is your starting version umber).

Note: In the future you will have an option to select a zone name as your source zone, as well as file system names as the source file systems.

As you create a new zone you have the option to select a source APP file system version, for example <b>apps1-prod_v-3</b>, the system will snap/clone using this file system presenting this to the new zone, the file system snap/clone will include in the name the source version, for example <b>apps1-prod_v-3</b>-z-1582908383-UNX-173558.

If you select to create a new DB/FS zone, the system will then auto select/generate the next available version number, and clone the file system using ZFS local replication for a NEW independent copy.
Note: You have the option to select a source version for the new copy.

All Solaris Global(s) hosts should be configured in sets, meaning if dc1-server1 is in dc1, you should also configure a dc2-server1.

At time of installing:
New zones will get created on the server with the least loaded Global (the system auto selects that).
New zones get pushed out in sets. for example if creating zone z123, two zone(s) of z123 will get installed one in dc1(HA) and one dc2(DR) 

Note: Many areas of the application assume that the Oracle Solaris global host name(s) use a prefix of dc1- and dc2- to identify HA and DR.
For example.

<pre>
# Data Center 1
dc1-devops1
dc1-devops2
# Data Center 2
dc2-devops1
dc2-devops2
</pre>
Note: As we continue to improve the application, we are trying to make sure and remove this constrains.

<h4>Development environment configuration</h4>

Lets configure a development environment, you will need this to compile the frontend code making it ready for production use.

Below I will refer to the top level directory as devops-src.

Create a directory devops-src
<pre>
mkdir devops-src && cd devops-src
git clone https://github.com/elik1001/devops-on-solaris-gui
mv devops-on-solaris-gui/backend .
mv devops-on-solaris-gui/frontend/zoneAdmin .
</pre>

<h5>Dev env configuration</h5>
Next, lets create our NodeJs development environment file, an example is below(of curse update based on your setup).

Note: Most of the configuration parameters are done latter in the Web-UI. However, a few basics have to be completed here.
cat devops-src/env.env
<pre>
DB_HOST=localhost
DB_PORT=27017
DB_USER=root
// You can use no password
//DB_PASS=pas$word
PORT=8080
NODE_NAME=192.168.100.169
NODE_ENV=development
</pre>

<h6>Downloading NodeJS modules</h6>
Next, we need to install required node models.

Run the below to do so.
<pre>
cd backend
npm install
</pre>

<h5>Update Angular properties</h5>

You will need to update your dev & prod NodeJS backend server(s), as well, as your Oracle Solaris server(s).

To do so, open the below file
This section starts about line 17.
<pre>
# devops-src/zoneAdmin/src/app/app.globals.ts
  getEnvironment(envName) {
    // Oracle Solaris host list, below are two lines. line one is data center 1, line two is data center 2.
    this.dc1Hosts = ['https://dc1-devops1.bnh.com:6788', 'https://dc1-devops2.bnh.com:6788'];
    this.dc2Hosts = ['https://dc2-devops1.bnh.com:6788', 'https://dc2-devops2.bnh.com:6788'];
    if (environment.production) {
      // You production backend server (host only as we use https)
      this.baseUrl = 'https://dc2-confmgr1.bnh.com:8080';
    } else {
      // You dev backend server (host or ip)
      this.baseUrl = 'http://192.168.100.169:8080';
    }
    return this[envName];
  }
</pre>
Note: This step might be removed in the future and updated dynamic from the backend.

<h6>Downloading Angular modules</h6>

Next, we need to install required node models.

Run the below to do so.
<pre>
cd devops-src/zoneAdmin
npm install
</pre>
We are mostly done, you can start the application in development.

<h5>Starting the application in development</h5>

<h6>Starting the backend</h6>
First lets start the back end
<pre>
cd devops-src/backend
node app.js &
# Output would like something like the below.
info: server started on port: 8080 {"timestamp":"2020-05-27T19:08:49.582Z"}
info: Mongodb connected {"timestamp":"2020-05-27T19:08:49.622Z"}
</pre>

Note: You can use pm2 to manage this, if so follow the prod instructions below, however, in development running node directly might be sufficient.

<h6>Starting the frontend</h6>

First lets start the back end
<pre>
cd devops-src/zoneAdmin
npm start  &
# Output would like something like the below.
> zone-admin@0.8.2 start /devops-src/zoneAdmin
> ng serve --host 0.0.0.0 --port 4201
...
Time: 13858ms
chunk {es2015-polyfills} es2015-polyfills.js, es2015-polyfills.js.map (es2015-polyfills) 285 kB [initial] [rendered]
chunk {main} main.js, main.js.map (main) 556 kB [initial] [rendered]
chunk {polyfills} polyfills.js, polyfills.js.map (polyfills) 236 kB [initial] [rendered]
chunk {runtime} runtime.js, runtime.js.map (runtime) 6.08 kB [entry] [rendered]
chunk {styles} styles.js, styles.js.map (styles) 443 kB [initial] [rendered]
chunk {vendor} vendor.js, vendor.js.map (vendor) 7.16 MB [initial] [rendered] ℹ ｢wdm｣: Compiled successfully.
</pre>
Note: In production we will be using a web server, something like Apache..

You can now access the Web-UI by going to the below URL.
<b>Note: </b>First time login. click on the register link and register a new admin account.
URL: http://your_ip:4201 (192.168.100.169:4201)
<ol>
<li>Type a user name like admin</li>
<li>Type a password</li>
<li>Select Local (not LDAP).</li>
</ol>

Login with your admin account and password.
Click on System Properties, completely fill out all system Properties, then hit save, you are now ready to start using the system by going to Jira Administration.

<h4>Moving the app to Production</h4>

For prod we will be using top directory as devops.

For the back end you can just copy the full application (you can remove the log files in the logs directory).

<h5>Prod env configuration</h5>
Next, lets create our NodeJs production environment file, an example is below(of curse update based on your setup).

Note: Most of the configuration parameters are done latter in the Web-UI. However, a few basics have to be completed here.
cat devops/env.env
<pre>
DB_HOST=localhost
DB_USER=root
DB_PORT=27017
// Password not enforced
//DB_PASS=pas$word
PORT=8080
NODE_NAME=dc2-confmgr1.bnh.com
NODE_ENV=production
</pre>

We will need to generate SSL certificates(an example is below),

Copy the certificate to your Apache/http ssl location and to NodeJS.

<b>Generating certificates</b>
Check out devops/backend/sslcert

cat ssl.conf (update host names that you will use)
<pre>
[ req ]
default_bits       = 2048
distinguished_name = req_distinguished_name
req_extensions     = req_ext
[ req_distinguished_name ]
countryName                 = US
countryName_default         = US
stateOrProvinceName         = New-Yrok
stateOrProvinceName_default = New-Yrok
localityName                = NY
localityName_default        = NY
organizationName            = Ops
organizationName_default    = Ops
commonName                  = dc2-confmgr1.bnh.com
commonName_max              = 64
commonName_default          = dc2-confmgr1.bnh.com
[ req_ext ]
subjectAltName = @alt_names
[alt_names]
DNS.1   = confmgr1.bnh.com
DNS.2   = dc1-confmgr1.bnh.com
DNS.3   = dc2-confmgr1.bnh.com
</pre>

Generate certificates
<pre>
openssl genrsa -out dc2-confmgr1.key 2048
openssl req -new -sha256 \
-out ca-private.csr \
-key dc2-confmgr1.key \
-config ssl.conf
openssl x509 -req \
-sha256 \
-days 3650 \
-in ca-private.csr \
-signkey dc2-confmgr1.key \
-out dc2-confmgr1.crt \
-extensions req_ext \
-extfile ssl.conf
</pre>

Configure and copy to Apache
Update you http ssl file - httpd-ssl.conf and make sure to include in your main httpd.conf file
<pre>
# Make sure mod_ssl is enabled in you main httpd.conf
DocumentRoot "/Library/WebServer/Documents"
ServerName dc2-confmgr1.bnh.com:443
SSLEngine on
SSLCertificateFile /etc/apache2/ssl/dc2-confmgr1.crt
SSLCertificateKeyFile /etc/apache2/ssl/dc2-confmgr1.key
</pre>

Copy certificate to NodeJS to the devops/backend/sslcert directory.
<pre>
cp dc2-confmgr1.crt dc2-confmgr1.key devops/backend/sslcert/.
</pre>
Note: The main app app.js is referencing the certificates i.e. dc2-confmgr1.crt and dc2-confmgr1.key, update the name if its otherwise.

<h5>Prod Angular frontend</h5>
For Angular/frontend you will have to compile the application and zip copy to your web server.

To compile the application, follow the below
<pre>
ng build --prod && npm run post-build
zip -rqq dist-v1.zip dist; cp dist-v1.zip /web/html # Or your path
mv dist/zoneAdmin html
</pre>
Note: To update your web app, just overwrite your existing copy and the app will prompt to re-load the new copy.

<h5>Starting prod</h5>

For production I like to use pm2, you can install pm2 with npm and use it like the below.
<pre>
cd devops/backend
npm install pm2
pm2 start app.js
# To see log output
pm2 log
</pre>

<h5>For the frontend / angular </h5>

For the frontend / angular just start you web server and go to https://your_url
For the first time use, follow the same configuration with user registration as in dev.

<h4>Application Notes</h4>

Account access: In the global zone I am using the root account, for all zone access I am using a prevlige account called confmgr, you will need to add the below to
/etc/user_attr.
<pre>
cat /etc/user_attr
...
confmgr::::auths=*;profiles=Primary Administrator,System Administrator,Zone Management,Zone Cold Migration,Zone Migration,Zone Configuration,Zone
Security,All;defaultpriv=all;lock_after_retries=no
informix::::profiles=Zone Management,Zone Cold Migration,Zone Migration,Zone Configuration,Zone Security,All;defaultpriv=all;lock_after_retries=no
...
</pre>

<h5>SSH Keys for Solaris Zones</h5>

You will have to configure ssh keys between the management server and the Solaris hosts,  this is used so the system can generate and copy a zone manifest and profile for your cloned zones. below is how to do so.
Note: The password for the ssh key will later on be added to the System Configuration in the Web-UI.

configuring ssh keys
<pre>
cd devops-src/ssh_keys
ssh-keygen -f ssh_private_key -t rsa -b 4096
Generating public/private rsa key pair.
Enter passphrase (empty for no passphrase):  <<< Make sure to typea password
# Verify
ls
ssh_private_key
ssh_private_key.pub

# Now copy to all Solaris globals
ssh-copy-id -i ssh_private_key root@dc1-devops1
# Note: If you dont have ssh-copy-id, copy the ssh_private_key.pub to remote host > ~root/.ssh/authorized_keys
</pre>

<b>Other notes:</b>
<ol>
<li><b>Logging: </b>The application loges to logs directory using winston logger.</li>
<li><b>Angular hot reload: </b>The angular application uses versions to check for new version and will prompt the user to reload</li>
</ol>

For additional configuration details please follow this document <a href="README.md">configuration documentation</a>.

<p>Below is an sample workflow we are using.
<br><img src="../images/devops_flow.png" alt="Solaris DevOps Workflow" align="middle" height="50%"></p>

<p>Screen shout of the associated ZFS Appliance snap/clone(s).
<br><img src="../images/zfssa-apps-snap.png" alt="ZFSSA snap/clones" align="middle" height="50%"></p>

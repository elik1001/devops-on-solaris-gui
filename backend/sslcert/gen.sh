:
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

#openssl genrsa -out dc2-confmgr1.key 2048
#openssl req -new -x509 -key dc2-confmgr1.key -out dc2-confmgr1.cert -days 3650 -subj /CN=dc2-confmgr1.domain.com


# from node js docs
#openssl genrsa -out dc2-confmgr1.key
#openssl req -new -key dc2-confmgr1.key -out ca-privae.pem
#openssl x509 -req -days 3650 -in ca-privae.pem -signkey dc2-confmgr1.key -out dc2-confmgr1.crt -extensions req_ext -extfile ssl.conf
#rm csr.pem


#openssl genrsa -out client-key.pem 2048
#openssl req -new -key client-key.pem -out client.csr
#openssl x509 -req -in client.csr -signkey client-key.pem -out client-cert.pem

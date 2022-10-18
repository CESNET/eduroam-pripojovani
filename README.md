**This repository is archived, because the code contained is EOL.**

# About
This application is intended for displaying connection status of organizations from czech eduroam insfrastructure. 
It is accessible at [https://pripojovani.eduroam.cz](https://pripojovani.eduroam.cz).

# Goals of this application
There are several main goals of this application:
- give quick and simple overview of whole czech infrastructure 
- track status in time
- simplify administration
- help joining organizations to be able to check their own state (see whats needed to finish joining)

# Application internals

Application is writen in node.js.

## Data synchronization

The application internally queries data in LDAP. Query is done dynamically for each request on specific realm. Synchronization is also done
automatically for all realms once a day. Synchronized data are stored in mongodb database.
Storing data in own database enables simple state tracking in time.

## Database structure

Application database is composed of two collections - realms and managers.

Realms collection:

```
> db.realms.find({dn : "cn=cesnet.cz,ou=Realms,o=eduroam,o=apps,dc=cesnet,dc=cz"})
{ "_id" : ObjectId("5aa11d68dc795a889368af49"), "dn" : "cn=cesnet.cz,ou=Realms,o=eduroam,o=apps,dc=cesnet,dc=cz", "last_change" : ISODate("2018-03-08T11:24:23.377Z"), "connection_status" : "connected", "connection_timestamp" : ISODate("2004-05-01T00:00:00Z"), "managers" : [ "uid=semik,ou=people,dc=cesnet,dc=cz", "uid=dans,ou=people,dc=cesnet,dc=cz", "uid=chvojka,ou=people,dc=cesnet,dc=cz", "uid=machv,ou=people,dc=cesnet,dc=cz" ], "org_active" : true, "org_ico" : "63839172", "org_id" : "A010000", "org_name" : "CESNET, z. s. p. o.", "radius" : true, "realms" : [ "cesnet.cz", "cesnet.eu", "guest.cesnet.cz" ], "register_timestamp" : ISODate("2004-05-01T00:00:00Z"), "testing_id" : true, "type" : "IdPSP", "coverage_info" : true }
{ "_id" : ObjectId("5cf13bd17d855b16bbbbc53a"), "dn" : "cn=cesnet.cz,ou=Realms,o=eduroam,o=apps,dc=cesnet,dc=cz", "last_change" : ISODate("2019-05-31T14:36:00.919Z"), "connection_status" : "connected", "connection_timestamp" : ISODate("2004-05-01T00:00:00Z"), "coverage_info" : true, "managers" : [ "uid=semik,ou=people,dc=cesnet,dc=cz", "uid=dans,ou=people,dc=cesnet,dc=cz", "uid=chvojka,ou=people,dc=cesnet,dc=cz", "uid=machv,ou=people,dc=cesnet,dc=cz" ], "radius" : true, "realms" : [ "cesnet.cz", "cesnet.eu", "guest.cesnet.cz" ], "register_timestamp" : ISODate("2004-05-01T00:00:00Z"), "testing_id" : true, "type" : "IdPSP" }
{ "_id" : ObjectId("5cf13c6f7d855b16bbbbcc10"), "dn" : "cn=cesnet.cz,ou=Realms,o=eduroam,o=apps,dc=cesnet,dc=cz", "last_change" : ISODate("2019-05-31T14:38:39.143Z"), "connection_status" : "connected", "connection_timestamp" : ISODate("2004-05-01T00:00:00Z"), "coverage_info" : true, "managers" : [ "uid=semik,ou=people,dc=cesnet,dc=cz", "uid=dans,ou=people,dc=cesnet,dc=cz", "uid=chvojka,ou=people,dc=cesnet,dc=cz", "uid=machv,ou=people,dc=cesnet,dc=cz" ], "org_active" : true, "org_ico" : "63839172", "org_id" : "A010000", "org_name" : "CESNET, z. s. p. o.", "radius" : true, "realms" : [ "cesnet.cz", "cesnet.eu", "guest.cesnet.cz" ], "register_timestamp" : ISODate("2004-05-01T00:00:00Z"), "testing_id" : true, "type" : "IdPSP" }
{ "_id" : ObjectId("5d78e6a37d855b16bbeb4b82"), "dn" : "cn=cesnet.cz,ou=Realms,o=eduroam,o=apps,dc=cesnet,dc=cz", "last_change" : ISODate("2019-09-11T12:20:51.834Z"), "connection_status" : "connected", "connection_timestamp" : ISODate("2004-05-01T00:00:00Z"), "coverage_info" : true, "managers" : [ "uid=semik,ou=people,dc=cesnet,dc=cz", "uid=dans,ou=people,dc=cesnet,dc=cz", "uid=chvojka,ou=people,dc=cesnet,dc=cz", "uid=machv,ou=people,dc=cesnet,dc=cz", "uid=valder,ou=people,dc=cesnet,dc=cz" ], "org_active" : true, "org_ico" : "63839172", "org_id" : "A010000", "org_name" : "CESNET, z. s. p. o.", "radius" : true, "realms" : [ "cesnet.cz", "cesnet.eu", "guest.cesnet.cz" ], "register_timestamp" : ISODate("2004-05-01T00:00:00Z"), "testing_id" : true, "type" : "IdPSP" }
{ "_id" : ObjectId("5e2283179bc4f80042f77675"), "dn" : "cn=cesnet.cz,ou=Realms,o=eduroam,o=apps,dc=cesnet,dc=cz", "last_change" : ISODate("2020-01-18T04:00:00.049Z"), "connection_status" : "connected", "connection_timestamp" : ISODate("2004-05-01T00:00:00Z"), "coverage_info" : true, "managers" : [ "uid=semik,ou=people,dc=cesnet,dc=cz", "uid=dans,ou=people,dc=cesnet,dc=cz", "uid=chvojka,ou=people,dc=cesnet,dc=cz", "uid=machv,ou=people,dc=cesnet,dc=cz" ], "org_active" : true, "org_ico" : "63839172", "org_id" : "A010000", "org_name" : "CESNET, z. s. p. o.", "radius" : true, "realms" : [ "cesnet.cz", "cesnet.eu", "guest.cesnet.cz", "admin.eduroam.cz" ], "register_timestamp" : ISODate("2004-05-01T00:00:00Z"), "testing_id" : true, "type" : "IdPSP" }
{ "_id" : ObjectId("5e461b959bc4f80042cfd912"), "dn" : "cn=cesnet.cz,ou=Realms,o=eduroam,o=apps,dc=cesnet,dc=cz", "last_change" : ISODate("2020-02-14T04:00:00.051Z"), "connection_status" : "connected", "connection_timestamp" : ISODate("2004-05-01T00:00:00Z"), "coverage_info" : true, "managers" : [ "uid=818c0a,ou=people,o=eduroam,o=apps,dc=cesnet,dc=cz", "uid=453c04,ou=people,o=eduroam,o=apps,dc=cesnet,dc=cz", "uid=85cd0c,ou=people,o=eduroam,o=apps,dc=cesnet,dc=cz", "uid=ee4208,ou=people,o=eduroam,o=apps,dc=cesnet,dc=cz" ], "org_active" : true, "org_ico" : "63839172", "org_id" : "A010000", "org_name" : "CESNET, z. s. p. o.", "radius" : true, "realms" : [ "cesnet.cz", "cesnet.eu", "guest.cesnet.cz", "admin.eduroam.cz" ], "register_timestamp" : ISODate("2004-05-01T00:00:00Z"), "testing_id" : true, "type" : "IdPSP" }
```

Managers collection:

```
> db.managers.find()
{ "_id" : ObjectId("5a86d77fdc795a88932429b3"), "dn" : "uid=semik,ou=people,dc=cesnet,dc=cz", "name" : "Jan Tomášek" }
{ "_id" : ObjectId("5a86d77fdc795a88932429c7"), "dn" : "uid=chvojka,ou=people,dc=cesnet,dc=cz", "name" : "Jan Chvojka" }
```


## Frontend

Frontend is composed of HTML, CSS and javascript. Angular was chosen as a framework for frontend for ease of manipulation with backend data.


# TODO
- automatically generated link to RT system (evidence that organization is being worked on) 
- link to CAAS (more details available, but authentication required) 
- support other languages

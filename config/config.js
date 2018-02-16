// confoguration file
// ==========================================================================================
module.exports = {
  //ldap_host            : 'ldap.cesnet.cz',	// TODO
  ldap_host            : 'cml.cesnet.cz',
  bind_dn              : 'uid=monitor.eduroam.cz,ou=special users,dc=cesnet,dc=cz',
  search_base_realms   : 'ou=Realms,o=eduroam,o=apps,dc=cesnet,dc=cz',
  search_base_radius   : 'ou=Radius Servers,o=eduroam,o=apps,dc=cesnet,dc=cz',
  search_base_orgs     : 'ou=Organizations,dc=cesnet,dc=cz',
  lang		       : 'cz'
}
// ==========================================================================================

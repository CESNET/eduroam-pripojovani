// --------------------------------------------------------------------------------------
// index controller
// --------------------------------------------------------------------------------------
angular.module('connection').controller('index_controller', ['$scope', '$window',
                       function ($scope, $window) {
  $scope.data = data;		// set scope variable from global variable
  $scope.local_storage_version = 1;

  set_filters($scope, $window);
  add_timestamps($scope.data);
  transform_values($scope.data);

  $scope.check_problematic = function() {
    if($scope.orgs_connection_filter.key == "problémové")  // filter orgs by problematic
      $scope.problem_filter = true;
    else
      $scope.problem_filter = undefined;
  }
}]);
// --------------------------------------------------------------------------------------
// set default values for variables
// --------------------------------------------------------------------------------------
function set_defaults($scope)
{
  $scope.sort_type = "org_name";
  $scope.reverse_sort = false;
  $scope.problem_filter = undefined;
  $scope.orgs_connection_filter = $scope.org_types[0];          // set default value
}
// --------------------------------------------------------------------------------------
// save data to localStorage
// --------------------------------------------------------------------------------------
function save_data($scope)
{
  var data = {};

  if($scope.orgs_name_filter !== undefined && $scope.orgs_name_filter != "" && $scope.orgs_name_filter !== null)
    data.orgs_name_filter = $scope.orgs_name_filter;

  if($scope.problem_filter !== undefined)
    data.problem_filter = $scope.problem_filter;

  data.orgs_connection_filter = $scope.orgs_connection_filter;
  data.sort_type = $scope.sort_type;
  data.reverse_sort = $scope.reverse_sort;
  data.version = $scope.local_storage_version;

  localStorage.setItem("data", JSON.stringify(data));
}
// --------------------------------------------------------------------------------------
// load data from localStorage
// --------------------------------------------------------------------------------------
function load_data($scope)
{
  try {
    var data = JSON.parse(localStorage.getItem("data"));      // try to parse object

    if(data.version === undefined || data.version != $scope.local_storage_version)    // undefined or not matching version
      set_defaults($scope);

    else {    // matching data version
      if(data.orgs_connection_filter !== undefined)
        $scope.orgs_connection_filter = data.orgs_connection_filter;
      else
        $scope.orgs_connection_filter = $scope.org_types[0];

      if(data.orgs_name_filter !== undefined && $scope.orgs_name_filter != "" && $scope.orgs_name_filter !== null)
        $scope.orgs_name_filter = data.orgs_name_filter;

      if(data.sort_type !== undefined)
        $scope.sort_type = data.sort_type;
      else
        $scope.sort_type = "org_name";

      if(data.reverse_sort !== undefined)
          $scope.reverse_sort = data.reverse_sort;
      else
        $scope.reverse_sort = false;

      if(data.problem_filter !== undefined)
        $scope.problem_filter = data.problem_filter;
      else
        $scope.problem_filter = undefined;
    }
  }
  catch (e) { // parsing did not succeed
    set_defaults($scope);
  }
}
// --------------------------------------------------------------------------------------
// set filtering variables
// --------------------------------------------------------------------------------------
function set_filters($scope, $window)
{
  // set default values for select
  $scope.org_types = [{
      key : "pouze připojující se",
      value : "připojuje se",
    }, {
      key : "připojené",
      value : "připojeno",
    }, {
      key : "odpojené",
      value : "odpojeno",
    }, {
      key : "problémové",
      value  : "",
    }, {
      key : "všechny",
      value: ""
  }];

  // save to localStorage before leaving page
  $window.onbeforeunload = function(){
    save_data($scope);
  };

  // get data from localStorage
  if(localStorage.getItem("data") !== null)       // variable "data" is defined in localStorage
    load_data($scope);
  else
    set_defaults($scope);
}
// --------------------------------------------------------------------------------------
// add timestamps
// --------------------------------------------------------------------------------------
function add_timestamps(data)
{
  for(var item in data) {
    if(data[item]['register_timestamp']) {
      data[item]['register_date'] = new Date(data[item]['register_timestamp']);
      data[item]['register_date'] = convert_to_local_date_string(data[item]['register_date']);
    }

    if(data[item]['connection_timestamp']) {
      data[item]['connection_date'] = new Date(data[item]['connection_timestamp']);
      data[item]['connection_date'] = convert_to_local_date_string(data[item]['connection_date']);
    }

    data[item]['last_change_date'] = new Date(data[item]['last_change']);
    data[item]['last_change_date'] = convert_to_local_date_string(data[item]['last_change_date']);

    data[item]['last_change_date'] = new Date(data[item]['last_change']);
    data[item]['last_change_date'] = convert_to_local_date_string(data[item]['last_change_date']);

    // for connected orgs this is not displayed
    // so this is actually only for sorting all orgs
    data[item]['without_changes'] = (new Date().getTime() - new Date(data[item]['last_change']).getTime()) / 1000;
    data[item]['without_changes'] = dhm_string(data[item]['without_changes']);
  }
}
// --------------------------------------------------------------------------------------
// convert input to local time and return as string
// --------------------------------------------------------------------------------------
function convert_to_local_date_string(input)
{
  var ret = "";
  var tmp = input.toISOString(); 
  // TODO ?// substract UTC offset

  return tmp.replace(/T.*$/, '').split('-')[2] + ". " + tmp.replace(/T.*$/, '').split('-')[1] + ". " +  tmp.replace(/T.*$/, '').split('-')[0];
}
// --------------------------------------------------------------------------------------
// return input converted to max of days, hours and minutes 
// all is fixed to 2 digits
// --------------------------------------------------------------------------------------
function dhm_string(input)
{
  var days = Math.floor(input / 86400);
  input = input % 86400;

  var hours = Math.floor(input / 3600);
  input = input % 3600;

  var minutes = Math.floor(input / 60);

  if(days == 0) {
    if(hours == 0)
      return minutes + " minut";
    else
      return hours + " hodin";
  }
  else
    return days + " dní";
}
// --------------------------------------------------------------------------------------
// transform database values to human readable values
// --------------------------------------------------------------------------------------
function transform_values(data)
{
  // all possible connection states
  var connection = {
    "connected" : "připojeno",
    "in-process" : "připojuje se",
    "disconnected" : "odpojeno"
  };

  var bool = {
    "true" : "ano",
    "false" : "ne"
  };

  for(var item in data) {
    // transform values to Czech
    data[item]['connection_status'] = connection[data[item]['connection_status']];
    data[item]['testing_id'] = bool[data[item]['testing_id']];
    data[item]['radius'] = bool[data[item]['radius']];
    data[item]['xml_url'] = bool[data[item]['xml_url']];

    // -----------------------------------

    // -----------------------------------

    if(data[item].org_active == true) {     // org is active
      data[item].appointment_delivered = 'n/a';       // no appointment needed if org is active
    }

    else {                                  // org is not active [ org.active == false or null ]
      if(data[item].type != "SP")   {       // appointment is only needed from IdP+SP or IdP types
        if(data[item].appointment === undefined || data[item].appointment === null)      // no appointment information exists
          data[item]['appointment_delivered'] = 'ne'
        else {                                        // appointment was delivered
          data[item]['appointment_date'] = new Date(data[item]['appointment']);
          data[item]['appointment_date'] = convert_to_local_date_string(data[item]['appointment_date']);
          data[item]['appointment_delivered'] = 'ano'
        }
      }
    }

    if(data[item]['type'] == 'IdPSP') // change to IdP+SP
      data[item]['type'] = 'IdP+SP';
    else if(data[item]['type'] == 'SP') {    // SP only
      data[item]['testing_id'] = 'n/a';     // set testing user to n/a
      data[item]['appointment_delivered'] = 'n/a'
    }
    // else IdP only

    // set problem attribute for angular filter
    set_problem(data[item]);
  }

  return data;
}
// --------------------------------------------------------------------------------------
// set problem attribute based on given input
// --------------------------------------------------------------------------------------
function set_problem(item)
{
  if(item.connection_status == "odpojeno") // do not process orgs that are disconnected
    return;

  if(item.org_name === undefined)
    item.problem = true;

  if(item.testing_id == "ne" || item.testing_id === undefined)
    item.problem = true;

  if(item.xml_url == "ne" || item.xml_url === undefined)
    item.problem = true;

  if(item.radius == "ne" || item.radius === undefined)
    item.problem = true;

  if(item.register_date == "ne" || item.register_date === undefined)
    item.problem = true;

  if(item.connection_date == "ne" || item.connection_date === undefined)
    item.problem = true;

  if(item.appointment_delivered == "ne" || (item.active == true && item.appointment === undefined))
    item.problem = true;
}
// --------------------------------------------------------------------------------------
// org controller
// --------------------------------------------------------------------------------------
angular.module('connection').controller('org_controller', ['$scope', '$http',
                       function ($scope, $http) {
  $scope.data = data;		// set scope variable from global variable
  add_timestamps($scope.data);
  transform_values($scope.data);
}]);
// --------------------------------------------------------------------------------------

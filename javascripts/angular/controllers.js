// --------------------------------------------------------------------------------------
// index controller
// --------------------------------------------------------------------------------------
angular.module('connection').controller('index_controller', ['$scope', '$http',
                       function ($scope, $http) {
  $scope.data = data;		// set scope variable from global variable
  $scope.sort_type = "org_name"; // default sorting is alphabetical
  $scope.orgs_connection_filter = "připojuje se"; // default filter
  
  add_timestamps($scope.data);
  transform_values($scope.data);
}]);
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

    if(data[item]['connection_status'] != 'connected') {     // only apply for not connected
      data[item]['without_changes'] = (new Date().getTime() - new Date(data[item]['last_change']).getTime()) / 1000;
      data[item]['without_changes'] = dhm_string(data[item]['without_changes']);
    }
    else
      data[item]['without_changes'] = 'n/a';
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

    if(data[item]['type'] == 'IdPSP') // change to IdP+SP
      data[item]['type'] = 'IdP+SP';
    else    // SP only
      data[item]['testing_id'] = 'n/a';     // set testing user to n/a
  }

  return data;
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

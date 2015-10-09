var app = angular.module( "myApp", [] )

app.controller( "indexCtrl", [ "$scope", "$http", function( $scope, $http ) {
    $scope.params = {
        room_id: null,
        room_password: null,
        client_name: null
    };
    $scope.test = "test";
    
    $scope.joinRoom = function() {
        $http.post( "/join", $scope.params );    
    };
    
    
}]);
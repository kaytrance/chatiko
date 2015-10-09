var app = angular.module( "myApp", [] )

app.controller( "indexCtrl", [ "$scope", "$http", function( $scope, $http ) {
    $scope.params = {
        room_id: null,
        room_password: null,
        client_name: null
    };
    
    $scope.joinRoom = function() {
        $http.post( "/join", $scope.params ).success( function ( data ) {
            if( data.status === 0 )
                window.location.href = "/enter/" + $scope.params.room_id.toLowerCase() + "/" + data.message;
            else
                Materialize.toast( 'Incorrect information, try again', 4000 );
        });    
    };
}]);
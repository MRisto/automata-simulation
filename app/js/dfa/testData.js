"use strict";

//GRAPHDESIGNER for the svg diagramm
var testData = function($scope) {
    self = this;

    self.testDFA = function() {
        $scope.config.finalStates.push(3);
        $scope.inputWord = "abc";
        $scope.addStateWithPresets(50, 50);
        $scope.addStateWithPresets(50, 200);
        $scope.addStateWithPresets(200, 200);
        $scope.addStateWithPresets( 200, 50);


        $scope.addTransition(0, 1, "a");
        $scope.addTransition(1, 2, "b");
        $scope.addTransition(2, 3, "c");
        $scope.addTransition(3, 0, "l");

    }

}
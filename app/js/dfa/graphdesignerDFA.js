//GRAPHDESIGNER for the svg diagramm
function GraphdesignerDFA($scope, svgSelector) {
    "use strict";

    var self = this;

    //prevents that the user can do more than one action
    self.inAction = false;
    //if this is true, then it calls the addClickfunction after the next
    self.inAddState = false;
    self.inAddTransition = false;
    self.selectedState = null;
    self.showStateContext = false;

    //graphdesigner settings
    self.settings = {
        stateRadius: 25,
        finalStateRadius: 29,
        selected: false
    };
    //is for the selfReference
    var stretchX = 40;
    var stretchY = 18;

    self.stateSelfReferenceNumber = Math.sin(45 * (Math.PI / 180)) * self.settings.stateRadius;

    //has the drawn Transition
    //{fromState:0,toState:0,names:["a","b"], objReference:};
    //if there is already a transition with the right fromState and toState, thenn only add myname to the names array
    $scope.drawnTransitions = [];


    /**
     * Check if transition already drawn
     * @param   {number}  fromState 
     * @param   {number}  toState   
     * @returns {boolean}
     */
    self.existDrawnTransition = function (fromState, toState) {

        var tmp = false;
        for (var i = 0; i < $scope.drawnTransitions.length; i++) {
            var transition = $scope.drawnTransitions[i];
            if (transition.fromState == fromState && transition.toState == toState) {
                tmp = true;
            }
        }
        return tmp;
    };

    /**
     * Get a drawn Transition
     * @param   {number} fromState 
     * @param   {number} toState   
     * @returns {object} 
     */
    self.getTransition = function (fromState, toState) {
        for (var i = 0; i < $scope.drawnTransitions.length; i++) {
            var transition = $scope.drawnTransitions[i];
            if (transition.fromState == fromState && transition.toState == toState) {
                return transition;
            }
        }
    };

    /**
     * get a string to draw the transition names
     * @param   {[[Type]]} names [[Description]]
     * @returns {[[Type]]} [[Description]]
     */
    self.prepareTransitionNamesForSvg = function (names) {
        var tmpString = '';
        for (var i = 0; i < names.length; i++) {
            tmpString += names[i] + " " + $scope.config.transitionNameSuffix + " ";
        }
        tmpString = tmpString.slice(0, -2);
        return tmpString;
    };



    /**
     * Clears the svgContent, resets scale and translate and delete drawnTransitionContent
     */
    self.clearSvgContent = function () {
        //Clear the content of the svg
        self.svgTransitions.html("");
        self.svgStates.html("");
        //change the scale and the translate to the updatedConfig
        self.svg.attr("transform", "translate(" + $scope.config.diagrammX + "," + $scope.config.diagrammY + ")" + " scale(" + $scope.config.diagrammScale + ")");
        svgOuterZoomAndDrag.scale($scope.config.diagrammScale);
        svgOuterZoomAndDrag.translate([$scope.config.diagrammX, $scope.config.diagrammY]);
        $scope.drawnTransitions = [];

    };

    /**
     * Scale and Translate the Svg to the default Value
     */
    self.scaleAndTranslateToDefault = function () {
        self.svg.attr("transform", "translate( " + $scope.defaultConfig.diagrammX + " " + $scope.defaultConfig.diagrammY + " )" + " scale( " + $scope.defaultConfig.diagrammScale + " )");
        $scope.config.diagrammScale = $scope.defaultConfig.diagrammScale;
        $scope.config.diagrammX = $scope.defaultConfig.diagrammX;
        $scope.config.diagrammY = $scope.defaultConfig.diagrammY;
        $scope.safeApply();
        svgOuterZoomAndDrag.scale($scope.defaultConfig.diagrammScale);
        svgOuterZoomAndDrag.translate([$scope.defaultConfig.diagrammX, $scope.defaultConfig.diagrammY]);
    };





    self.maxZoomOut = 2.5;
    self.maxZoomIn = 0.5;
    var svgOuterZoomAndDrag = d3.behavior
        .zoom()
        .scaleExtent([self.maxZoomIn, self.maxZoomOut])
        .on("zoom", function () {
            //dont translate on right click (3)
            if (d3.event.sourceEvent.which == 1) {
                console.log("SvgOuterZoomAndTranslate");
                self.svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
                $scope.config.diagrammScale = d3.event.scale;
                $scope.config.diagrammX = d3.event.translate[0];
                $scope.config.diagrammY = d3.event.translate[1];
                $scope.safeApply();

                //update Grid
                self.drawGrid();
            }

        });


    //prevents the normal rightclickcontextmenu and add zoo
    self.svgOuter = d3.select(svgSelector)
        .call(svgOuterZoomAndDrag).on("contextmenu", function () {
            d3.event.preventDefault();
            if (!self.rightClick) {
                console.log("RICHT click svouter");
                if (self.stateWithActiveMenu !== null && self.stateWithActiveMenu !== undefined) {
                    self.setStateClassAs(self.stateWithActiveMenu.id, false, "selectedForTransition");
                    self.stateWithActiveMenu = null;
                    self.showStateContext = false;
                }
                $scope.safeApply();
            } else {
                self.rightClick = false;
            }
        });



    self.svg = self.svgOuter
        .append("g")
        .attr("id", "svg-items");

    //the html element where we put the svgGrid into
    self.svgGrid = self.svgOuter.append("g").attr("id", "grid");
    //first draw the transitions -> nodes are in front of them if they overlap
    self.svgTransitions = self.svg.append("g").attr("id", "transitions");
    self.svgStates = self.svg.append("g").attr("id", "states");


    //the space between each SnappingPoint 1:(0,0)->2:(0+gridSpace,0+gridSpace)
    self.gridSpace = 100;
    //the distance when the state is snapped to the next SnappingPoint (Rectangle form)
    self.gridSnapDistance = 20;
    //is Grid drawn
    self.isGrid = false;

    /**
     * Draw the Grid
     */
    self.drawGrid = function () {
        if (self.isGrid) {
            //draw Grid
            self.svgGrid.html("");
            var width = self.svgOuter.style("width").replace("px", "");
            var height = self.svgOuter.style("height").replace("px", "");
            var thickness = 1 * $scope.config.diagrammScale * 0.5;
            var xOffset = ($scope.config.diagrammX % ( self.gridSpace* $scope.config.diagrammScale));
            var yOffset = ($scope.config.diagrammY % ( self.gridSpace* $scope.config.diagrammScale)) ;
            //xGrid
            for (var i = 0; i * $scope.config.diagrammScale < width; i += self.gridSpace * $scope.config.diagrammScale) {

                self.svgGrid
                    .append("line")
                    .attr("stroke-width", thickness)
                    .attr("class", "grid-line xgrid-line")
                    .attr("x1", (i + xOffset))
                    .attr("y1", 0)
                    .attr("x2", (i + xOffset))
                    .attr("y2", height);
            }
            //yGrid
            for (i = 0; i * $scope.config.diagrammScale < height; i += self.gridSpace * $scope.config.diagrammScale) {
                self.svgGrid
                    .append("line")
                    .attr("stroke-width", thickness)
                    .attr("class", "grid-line ygrid-line")
                    .attr("x1", 0)
                    .attr("y1", (i + yOffset))
                    .attr("x2", width)
                    .attr("y2", (i + yOffset));
            }

        } else {
            //undraw Grid
            self.svgGrid.html("");
        }
    };

    self.toggleGrid = function () {
        console.log("toggle");
        self.isGrid = !self.isGrid;
        console.log(self.isGrid);
        self.drawGrid();
    };

    //DEFS
    self.defs = self.svg.append('svg:defs');
    //Marker-Arrow
    self.defs.append('svg:marker')
        .attr('id', 'marker-end-arrow')
        .attr('refX', 8)
        .attr('refY', 3)
        .attr('markerWidth', 10)
        .attr('markerHeight', 10)
        .attr('orient', 'auto')
        .append('svg:path')
        .attr('d', 'M0,0 L0,6 L9,3 z');
    self.defs.append('svg:marker')
        .attr('id', 'marker-end-arrow-animated')
        .attr('refX', 8)
        .attr('refY', 3)
        .attr('markerWidth', 10)
        .attr('markerHeight', 10)
        .attr('orient', 'auto')
        .append('svg:path')
        .attr('d', 'M0,0 L0,6 L9,3 z');


    self.resetAdds = function () {
        if (self.selectedState !== null) {
            self.setStateClassAs(self.selectedState.attr("object-id"), false, "selectedForTransition");
            self.selectedState = null;
        }
        self.svgOuter.on("click", null);
        self.inAddTransition = false;
        self.inAddState = false;
    };


    /**
     * AddState function for the icon
     */
    self.addStateEventListener = function () {
        self.resetAdds();
        self.inAction = true;
        self.inAddState = true;
        //add listener
        self.svgOuter.on("click", function () {
            $scope.addStateWithPresets(d3.mouse(this)[0] - $scope.config.diagrammX, d3.mouse(this)[1] - $scope.config.diagrammY);
            self.inAddState = false;
            self.svgOuter.on("click", null);
        });
    };

    /**
     * Addtransition function for the icon
     */
    self.addTransitionEventListener = function () {
        self.resetAdds();
        self.inAction = true;
        self.inAddTransition = true;
        self.svgOuter.on("click", function () {});
    };

    self.removeEventListener = function () {
        self.resetAdds();
        self.inAction = true;
        self.inRemove = true;
    };


    /**
     * Renames the state in the svg after the $scope variable was changed
     * @param  {number} stateId      
     * @param  {String} newStateName          
     */
    self.renameState = function (stateId, newStateName) {
        var state = $scope.config.states[$scope.getArrayStateIdByStateId(stateId)];
        var objReference = state.objReference;
        objReference.select("text").text(newStateName);
    };

    /**
     * Removes the state with the given id
     * @param  {number} stateId 
     */
    self.removeState = function (stateId) {
        var state = $scope.config.states[$scope.getArrayStateIdByStateId(stateId)];
        var objReference = state.objReference;
        objReference.remove();
    };


    self.renameTransition = function (transitionId, newTransitionName) {

    };


    self.removeTransition = function (transitionId) {

    };

    self.addFinalState = function (stateId) {
        var state = $scope.getStateById(stateId);
        state.objReference.insert("circle", ".state-circle")
            .attr("class", "final-state")
            .attr("r", self.settings.finalStateRadius);
    };

    /**
     * Removes a final state on the svg
     * @param {number} stateId 
     */
    self.removeFinalState = function (stateId) {
        var state = $scope.getStateById(stateId);
        state.objReference.select(".final-state").remove();
    };



    /**
     * Changes the StartState to the stateid
     * @param {number} stateId 
     */
    self.changeStartState = function (stateId) {
        //TODO:
        //remove old startState
        if ($scope.config.startState !== null) {
            var state = $scope.getStateById($scope.config.startState);
            state.objReference.select(".start-line").remove();
        }

        var otherState = $scope.getStateById(stateId);
        otherState.objReference.append("line")
            .attr("class", "transition-line start-line")
            .attr("x1", 0)
            .attr("y1", 0 - 75)
            .attr("x2", 0)
            .attr("y2", 0 - self.settings.stateRadius)
            .attr("marker-end", "url(#marker-end-arrow)");
    };

    /**
     * removes the stateId
     * @param {number} stateId
     */
    self.removeStartState = function (stateId) {
        var state = $scope.getStateById($scope.config.startState);
        state.objReference.select(".start-line").remove();
    };

    /**
     * Draws a State 
     * @param  {number} id The arrayid of the State
     * @return {Reference}    Returns the reference of the group object
     */
    self.drawState = function (id) {
        var state = $scope.getStateById(id);
        var group = self.svgStates.append("g")
            .attr("transform", "translate(" + state.x + " " + state.y + ")")
            .attr("class", "state " + "state-" + state.id)
            .attr("object-id", state.id); //save the state-id

        var circleSelection = group.append("circle")
            .attr("class", "state-circle")
            .attr("r", self.settings.stateRadius);

        var hoverCircle = group.append("circle")
            .attr("class", "state-circle hover-circle")
            .attr("r", self.settings.stateRadius);

        var text = group.append("text")
            .text(state.name)
            .attr("class", "state-text")
            .attr("dominant-baseline", "central")
            .attr("text-anchor", "middle");

        $scope.config.states[id].objReference = group;
        group.on('contextmenu', self.stateMenu);
        d3.selectAll(".state").call(self.dragState);
        return group;
    };

    /**
     * Adds or remove a class to a state ( only the svg state)
     * @param {number} stateId 
     * @param {Boolean} state   
     * @param {String} className  
     */
    self.setStateClassAs = function (stateId, state, className) {
        var objReference = $scope.getStateById(stateId).objReference;
        objReference.classed(className, state);
    };

    self.setTransitionClassAs = function (transitionId, state, className) {
        var trans = $scope.getTransitionById(transitionId);
        var objReference = self.getTransition(trans.fromState, trans.toState).objReference;
        objReference.classed(className, state);
        if (state && className == 'animated-transition') {
            objReference.select(".transition-line").attr("marker-end", "url(#marker-end-arrow-animated)");
        } else {
            objReference.select(".transition-line").attr("marker-end", "url(#marker-end-arrow)");
        }
    };


    self.stateMenu = function () {
        //open context menu
        self.rightClick = true;
        self.showStateContext = true;
        //get the selected state
        if (self.stateWithActiveMenu !== undefined && self.stateWithActiveMenu !== null) {
            self.setStateClassAs(self.stateWithActiveMenu.id, false, "selectedForTransition");
        }
        self.stateWithActiveMenu = $scope.getStateById(parseInt(d3.select(this).attr("object-id")));
        console.log(self.stateWithActiveMenu);
        self.setStateClassAs(self.stateWithActiveMenu.id, true, "selectedForTransition");




        //save the state values in the state context as default value
        self.input = {};
        self.input.state = self.stateWithActiveMenu;
        self.input.stateName = self.stateWithActiveMenu.name;
        self.input.startState = $scope.config.startState == self.stateWithActiveMenu.id;
        self.input.finalState = $scope.isStateAFinalState(self.stateWithActiveMenu.id);
        $scope.safeApply();
    };

    self.saveState = function () {
        $scope.renameState(self.input.state.id, self.input.stateName);
        if (self.input.startState) {
            $scope.changeStartState(self.input.state.id);
        } else {
            if (self.id == $scope.config.startState)
                $scope.removeStartState();
        }
        if (self.input.finalState) {
            $scope.addFinalState(self.input.state.id);
        } else {
            $scope.removeFinalState(self.input.state.id);
        }
        self.showStateContext = false;
    };


    //Node drag and drop behaviour
    self.dragState = d3.behavior.drag()
        .on("dragstart", function () {
            //stops the svgouter to get called
            d3.event.sourceEvent.stopPropagation();

            if (d3.event.sourceEvent.which == 1) {
                console.log("DRAGSTATESTART");
                //if we are in a addTransition action
                if (self.inAddTransition) {
                    //if there is no selectedState, then select a state ( =>fromState)
                    if (!self.selectedState) {
                        self.selectedState = d3.select(this);
                        self.setStateClassAs(self.selectedState.attr("object-id"), true, "selectedForTransition");
                    } else {
                        $scope.addTransition(parseInt(self.selectedState.attr("object-id")), parseInt(d3.select(this).attr("object-id")), "c");
                        self.setStateClassAs(self.selectedState.attr("object-id"), false, "selectedForTransition");
                        self.selectedState = null;
                    }
                } else if (self.inRemove) {
                    $scope.removeState(parseInt(d3.select(this).attr("object-id")));
                } else {
                    self.dragInitiated = true;
                }
            }
        })
        .on("drag", function () {
            if (d3.event.sourceEvent.which == 1) {

                //cant move when inAddTransition action
                if (self.dragInitiated && !self.inAddTransition) {
                    var x = d3.event.x;
                    var y = d3.event.y;

                    var snapPointX = x - (x % self.gridSpace);
                    var snapPointY = y - (y % self.gridSpace);

                    //check first snapping Point (top left)
                    if (x > snapPointX - self.gridSnapDistance && x < snapPointX + self.gridSnapDistance && y > snapPointY - self.gridSnapDistance && y < snapPointY + self.gridSnapDistance) {
                        x = snapPointX;
                        y = snapPointY;
                        //second snapping point (top right)
                    } else if (x > snapPointX + self.gridSpace - self.gridSnapDistance && x < snapPointX + self.gridSpace + self.gridSnapDistance && y > snapPointY - self.gridSnapDistance && y < snapPointY + self.gridSnapDistance) {
                        x = snapPointX + self.gridSpace;
                        y = snapPointY;
                        //third snapping point (bot left)
                    } else if (x > snapPointX - self.gridSnapDistance && x < snapPointX + self.gridSnapDistance && y > snapPointY + self.gridSpace - self.gridSnapDistance && y < snapPointY + self.gridSpace + self.gridSnapDistance) {
                        x = snapPointX;
                        y = snapPointY + self.gridSpace;
                        //fourth snapping point (bot right)
                    } else if (x > snapPointX + self.gridSpace - self.gridSnapDistance && x < snapPointX + self.gridSpace + self.gridSnapDistance && y > snapPointY + self.gridSpace - self.gridSnapDistance && y < snapPointY + self.gridSpace + self.gridSnapDistance) {
                        x = snapPointX + self.gridSpace;
                        y = snapPointY + self.gridSpace;
                    }
                    //update the shown node
                    d3.select(this)
                        .attr("transform", "translate(" + x + " " + y + ")");
                    //update the node in the array

                    var stateId = d3.select(this).attr("object-id");
                    var tmpState = $scope.getStateById(stateId);
                    //update the state coordinates in the dataobject
                    tmpState.x = x;
                    tmpState.y = y;

                    //update the transitions after dragging a node
                    self.updateTransitionsAfterStateDrag(d3.select(this).attr("object-id"));
                }
            }

        })
        .on("dragend", function () {
            if (d3.event.sourceEvent.which == 1) {
                console.log("DRAGSTATEEND");
                if (self.dragInitiated) {
                    self.dragInitiated = false;
                    //Apply the canges after the dragend ->optimisation
                    $scope.safeApply();
                } else if (d3.event.sourceEvent.which == 3) {
                    self.rightClick = false;
                }
                if (self.selectedState === null) {
                    self.resetAdds();
                }
                if (self.inRemove) {
                    self.resetAdds();
                    self.inRemove = false;
                }
                //fixes that the whole svg moves with the next move on the svg ( stupid workaround) BETTER SOLUTION?
                svgOuterZoomAndDrag.scale($scope.config.diagrammScale);
                svgOuterZoomAndDrag.translate([$scope.config.diagrammX, $scope.config.diagrammY]);
            }
        });

    /**
     * [getTransitionCoordinates description]
     * @param  {[type]} transitionId [description]
     * @return {[type]}              [description]
     */
    self.getTransitionCoordinates = function (fromStateId, toStateId) {
        var fromState = $scope.getStateById(fromStateId);
        var toState = $scope.getStateById(toStateId);
        var x1 = fromState.x;
        var y1 = fromState.y;
        var x2 = toState.x;
        var y2 = toState.y;
        var richtungsvektor = {
            "x": x2 - x1,
            "y": y2 - y1
        };
        var richtungsVectorLength = Math.sqrt(richtungsvektor.x * richtungsvektor.x + richtungsvektor.y * richtungsvektor.y),
            n = self.settings.stateRadius / richtungsVectorLength;
        x1 = x1 + n * richtungsvektor.x;
        y1 = y1 + n * richtungsvektor.y;
        x2 = x2 - n * richtungsvektor.x;
        y2 = y2 - n * richtungsvektor.y;
        var coordObj = {
            x1: x1,
            y1: y1,
            x2: x2,
            y2: y2,
            xDiff: x2 - x1,
            yDiff: y2 - y1,
            xMid: (x1 + x2) / 2,
            yMid: (y1 + y2) / 2
        };
        coordObj.distance = Math.sqrt(coordObj.xDiff * coordObj.xDiff + coordObj.yDiff * coordObj.yDiff);


        return coordObj;

    };


    self.getTransitionCurveData = function (coordObj) {
        var vecA = {
            x: coordObj.xMid - coordObj.x1,
            y: coordObj.yMid - coordObj.y1,
            z: 0
        };

        var vecB = {
            x: 0,
            y: 0,
            z: 1
        };

        coordObj.movingPoint = crossPro(vecA, vecB);
        coordObj.movingPoint = expandVector(coordObj.movingPoint, 70 * (1 / coordObj.distance * 1.1));

        coordObj.xMidPoint = coordObj.movingPoint.x + coordObj.xMid;
        coordObj.yMidPoint = coordObj.movingPoint.y + coordObj.yMid;
        return coordObj;
    };

    function crossPro(a, b) {

        var vecC = {
            x: a.y * b.z,
            y: -a.x * b.z

        };
        return vecC;
    }

    function expandVector(a, factor) {
        return {
            x: a.x * factor,
            y: a.y * factor
        };
    }


    self.bezierLine = d3.svg.line()
        .x(function (d) {
            return d[0];
        })
        .y(function (d) {
            return d[1];
        })
        .interpolate("basis");


    self.selfTransition = function (x, y) {
        return self.bezierLine([
            [x - self.stateSelfReferenceNumber, y - self.stateSelfReferenceNumber],
            [x - self.stateSelfReferenceNumber - stretchX, y - self.stateSelfReferenceNumber - stretchY],
            [x - self.stateSelfReferenceNumber - stretchX, y + self.stateSelfReferenceNumber + stretchY],
            [x - self.stateSelfReferenceNumber, y + self.stateSelfReferenceNumber]
        ]);
    };


    self.transitionCurve = function (coordObj, justStraight) {
        self.getTransitionCurveData(coordObj);
        var array = null;
        if (!justStraight) {
            array = [
                [coordObj.x1, coordObj.y1],
                [coordObj.xMidPoint, coordObj.yMidPoint],
                [coordObj.x2, coordObj.y2]
            ];
        } else {
            array = [
                [coordObj.x1, coordObj.y1],
                [coordObj.x2, coordObj.y2]
            ];
        }
        return self.bezierLine(array);
    };

    /**
     * Draw a Transition
     * @param  {number} id 
     * @return {Reference}  Retruns the reference of the group object
     */
    self.drawTransition = function (transitionId) {
        var arrayTransitionId = $scope.getArrayTransitionIdByTransitionId(transitionId);
        var transition = $scope.config.transitions[arrayTransitionId];
        //if there is not a transition with the same from and toState
        if (!self.existDrawnTransition(transition.fromState, transition.toState)) {
            //if it is not a self Reference
            var group, line, text;
            if (transition.fromState != transition.toState) {
                var coordObj = self.getTransitionCoordinates(transition.fromState, transition.toState);
                self.getTransitionCurveData(coordObj);
                group = self.svgTransitions.append("g")
                    .attr("class", "transition");
                var curveData = null;
                //if there is a transition in the other direction
                if (self.existDrawnTransition(transition.toState, transition.fromState)) {
                    curveData = self.transitionCurve(coordObj, false);

                    var otherCoordObj = self.getTransitionCoordinates(transition.toState, transition.fromState);
                    var otherCurveData = self.transitionCurve(otherCoordObj, false);
                    var otherTrans = self.getTransition(transition.toState, transition.fromState);
                    otherTrans.objReference.select(".transition-line").attr("d", otherCurveData);
                } else {
                    curveData = self.transitionCurve(coordObj, true);
                }
                line = group.append("path")
                    .attr("class", "transition-line curvedLine")
                    .attr("d", curveData)
                    .attr("stroke", "red")
                    .attr("stroke-width", 1)
                    .attr("fill", "none")
                    /*.attr("x2", coordObj.xDiff)
                    .attr("y2", coordObj.yDiff)*/
                    .attr("marker-end", "url(#marker-end-arrow)");

                text = group.append("text")
                    .attr("class", "transition-text")
                    .text(transition.name)
                    .attr("x", (coordObj.xMidPoint))
                    .attr("y", (coordObj.yMidPoint));

                //add the drawnTransition
                $scope.drawnTransitions.push({
                    fromState: transition.fromState,
                    toState: transition.toState,
                    names: [transition.name],
                    objReference: group
                });
                return group;
            } else {
                var stateId = $scope.getArrayStateIdByStateId(transition.fromState);
                var x = $scope.config.states[stateId].x;
                var y = $scope.config.states[stateId].y;

                group = self.svgTransitions.append("g")
                    .attr("transform", "translate(0 0)")
                    .attr("class", "transition");

                line = group.append('path')
                    .attr("class", "transition-line")
                    .attr("d", self.selfTransition(x, y))
                    .attr("stroke", "red")
                    .attr("stroke-width", 1)
                    .attr("fill", "none")
                    .attr("marker-end", "url(#marker-end-arrow)");

                text = group.append("text")
                    .attr("class", "transition-text")
                    .text(transition.name)
                    .attr("x", x - self.settings.stateRadius - 50)
                    .attr("y", y);

                $scope.drawnTransitions.push({
                    fromState: transition.fromState,
                    toState: transition.toState,
                    names: [transition.name],
                    objReference: group
                });
                return group;
            }
        } else {
            var drawnTransition = self.getTransition(transition.fromState, transition.toState);
            drawnTransition.names.push(transition.name);
            //drawn the new name to the old transition
            drawnTransition.objReference.select(".transition-text").text(self.prepareTransitionNamesForSvg(drawnTransition.names));


        }
    };


    /**
     * Update the transitions in the svg after moving a state
     * @param  {number} stateId Moved stateId
     */
    self.updateTransitionsAfterStateDrag = function (stateId) {
        var stateName = $scope.config.states[$scope.getArrayStateIdByStateId(stateId)].name;
        _.forEach($scope.drawnTransitions, function (n, key) {
            if (n.fromState == stateId || n.toState == stateId) {
                //if its not a selfreference
                var obj;
                if (n.fromState != n.toState) {
                    obj = n.objReference;
                    var coordObj = self.getTransitionCoordinates(n.fromState, n.toState);

                    if (self.existDrawnTransition(n.toState, n.fromState)) {
                        obj.select(".transition-line").attr("d", self.transitionCurve(coordObj, false));
                    } else {
                        obj.select(".transition-line").attr("d", self.transitionCurve(coordObj, true));
                    }

                    obj.select("text")
                        .attr("x", coordObj.xMidPoint)
                        .attr("y", coordObj.yMidPoint);

                } else {
                    var moveStateId = n.fromState;
                    var x = $scope.config.states[$scope.getArrayStateIdByStateId(moveStateId)].x;
                    var y = $scope.config.states[$scope.getArrayStateIdByStateId(moveStateId)].y;
                    //update Transistion with self reference
                    obj = n.objReference;
                    obj.select(".transition-line")
                        .attr("d", self.selfTransition(x, y));
                    obj.select("text").attr("x", x - self.settings.stateRadius - 50)
                        .attr("y", y);
                }
            }
        });
    };

    $("div.close").click(function () {
        console.log("ASD");
    });
}

autoSim.Productions = function ($scope) {
    var self = this;

    console.log("langProduction");

    self.prefix = "A";
    self.productionId = 0;
    self.nonTerminal = [];
    self.terminal = [];
    self.startVariable = "S";

    self.create = function (prLeft, prRight) {
        if(prLeft == undefined) {
            prLeft = self.prefix;
        }
        
        // Type 3 language
        prLeftUpper = angular.uppercase(prLeft);

        return self.createWithId(self.productionId++, prLeftUpper, prRight);
    };
    
    self.createDefault = function () {
        
    };

    self.createWithId = function (pId, prLeft, prRight) {
        var production = new autoSim.Production(pId, prLeft, prRight);
        self.addNonTerminal(prLeft);
        self.addNonTerminal(prRight);
        self.addTerminal(prRight);
        self.addTerminal(prRight);
        self.push(production);
        return production;
    };

    self.addNonTerminal = function (variable) {
        var i = 0;
        var character = "";
        while ((character = variable[i]) !== undefined) {
            if (character == angular.uppercase(character)) {
                if(self.checkNonTerminalIfExist(character)) {
                    self.nonTerminal.push(character);
                    return character;
                }
            }
            i++;
        }
    };
    
    self.addTerminal = function (variable) {
        var i = 0;
        var character = "";
        while ((character = variable[i]) !== undefined) {
            if (character == angular.lowercase(character)) {
                if(self.checkTerminalIfExist(character)) {
                    self.terminal.push(character);
                    return character;
                }
            }
            i++;
        }
    };

    self.checkNonTerminalIfExist = function (char) {        
        for(var i = 0; self.nonTerminal[i] !== undefined; i++) {
            if(self.nonTerminal[i] == char) {
                return false;
            }
        }
        return true;
    };
    
    self.checkTerminalIfExist = function (char) {        
        for(var i = 0; self.terminal[i] !== undefined; i++) {
            if(self.terminal[i] == char) {
                return false;
            }
        }
        return true;
    };
    
    self.changeStartVariable = function (variable) {
        self.startVariable = variable;
        return self.startVariable;
    };

};
autoSim.Productions.prototype = Array.prototype;
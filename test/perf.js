//run mocha from project root

const assert = require('assert');
const Catbus = require('../dist/catbus.umd.js');

const root = Catbus.createChild();

let sourceLog;
let msgLog;
let topicLog;

function Watcher(name){

    this.name = name;

}


Watcher.prototype.handle = function(msg, source, topic){

    console.log('gotL:', msg, source);
    callback(msg, source, topic);

};

Watcher.prototype.add1 = function(msg, source, topic){

   return msg + 1;
};


Watcher.prototype.meow = function(msg, source, topic){

    console.log('meow:', msg, source);
    callback(msg, source, topic);
    return 'meow done meow!';

};

var watcher = new Watcher('moo');


function callback(msg, source, topic){

    msgLog.push(msg);
    sourceLog.push(source);
    topicLog.push(topic);

}

function resetLog(){

    sourceLog = [];
    msgLog = [];
    topicLog = [];

}


describe('RootScope', function(){

        var world;

        beforeEach(function(){

            resetLog();
            root.clear();
            world = root.createChild('world');

        });

        afterEach(function(){



        });

    it('can react to data', function(){


        const a = [];
        for(let i = 0; i < 1000000; i++){
            a.push(i);
        }

        const n = Date.now();

        const d = world.demand('castle');
        const e = world.demand('moo');

        const fs = {
            add1: function(x) { return x + 1; },
            even: function(x) { return x % 2 === 0;},
            sum: function(x, y) { return x + y;}
        };

        world.bus('~castle').split().process(' >even | *add1', fs).scan(fs.sum, 0).process('=moo');


        for(let j = 0; j < 10; j++) {
            d.write(a);
        }


        console.log('e', e.read());

        console.log('t', Date.now() - n, n);

    });



});


// todo add survey() test
// todo add silent transaction assertion
// todo add
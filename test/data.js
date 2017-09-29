//run mocha from project root

const assert = require('assert');
const Catbus = require('../dist/catbus.umd.js');

const root = Catbus.scope();

let topicLog;
let msgLog;
let sourceLog;

function callback(msg, topic, source){

    msgLog.push(msg);
    topicLog.push(topic);
    sourceLog.push(source);

}

function resetLog(){

    topicLog = [];
    msgLog = [];
    sourceLog = [];

}

describe('Data and Scopes', function(){

        let world;

        beforeEach(function(){

            root.clear();
            world = root.createChild('world');

        });

        afterEach(function(){

            resetLog();

        });

        it('can create named states', function(){

            let d = world.demand('ergo');
            let name = d.name;

            assert.equal(name, 'ergo');

        });

        it('can write to states', function(){

            let d = world.demand('ergo');
            d.write('proxy');
            let value = d.read();

            assert.equal(value, 'proxy');

        });

        it('can modify data', function(){

            let d = world.demand('ergo');
            d.write('autoreiv');
            d.write('re-l');
            let value = d.read();

            assert.equal(value, 're-l');

        });


        it('can toggle data', function(){

            let d = world.demand('ergo');
            d.write('wasteland');
            d.toggle();
            assert.equal(d.read(), false);
            d.toggle();
            assert.equal(d.read(), true);
            d.toggle();
            assert.equal(d.read(), false);

        });


        it('can subscribe to data via callbacks', function(){

            let d = world.demand('ergo');
            d.subscribe(callback);
            d.write('re-l');
            let value = msgLog[0];
            assert.equal(value, 're-l');

        });

    it('can subscribe to data and pull current value via callbacks', function(){

        let d = world.demand('ergo');
        d.write('re-l');
        d.write('vincent');
        d.subscribe(callback, true);
        d.write('romdeau');

        assert.equal(msgLog[0], 'vincent');
        assert.equal(msgLog[1], 'romdeau');

    });

    it('can unsubscribe to data', function(){


        let d = world.demand('ergo');

        d.subscribe(callback);
        d.write('re-l');
        d.unsubscribe(callback);
        d.write('vincent');
        d.subscribe(callback);
        d.write('proxy');

        assert.equal(msgLog[0], 're-l');
        assert.equal(msgLog[1], 'proxy');

    });


    it('can refresh existing data', function(){

        let d = world.demand('ergo');
        d.subscribe(callback);
        d.write('vincent');
        d.write('re-l');
        d.refresh();

        assert.equal(msgLog[2], 're-l');
        assert.equal(msgLog.length, 3);

    });

    it('creates child scopes', function(){

        let city1 = world.createChild();
        let city2 = world.createChild();

        let d0 = world.demand('ergo');
        let d1 = city1.demand('ergo');
        let d2 = city2.demand('proxy');

        d0.write('0');
        d1.write('1');
        d2.write('2');

        assert.equal(d0.read(), '0');
        assert.equal(d1.read(), '1');
        assert.equal(d2.read(), '2');

    });

    it('finds data in higher scopes', function(){


        let city1 = world.createChild();
        let city2 = world.createChild();

        let d0 = world.demand('ergo');
        let d1 = city1.demand('ergo');
        let d2 = city2.demand('proxy');

        d0.write('0');
        d1.write('1');
        d2.write('2');

        let f1 = city1.find('ergo');
        let f2 = city2.find('ergo');

        assert.equal(f1.read(), '1');
        assert.equal(f2.read(), '0');

    });

    it('can write transactions', function(){


        let d0 = world.demand('proxy');
        let d1 = world.demand('ergo');
        let d2 = world.demand('autoreiv');

        let result;

        d0.subscribe(function(msg){
            result = msg;
            assert(d0.read(), 'grey');
            assert(d1.read(), 'black');
            assert(d2.read(), 'chrome');
        });

        world.write({proxy: 'grey', ergo: 'black', autoreiv: 'chrome'});

        assert(result, 'grey');


    });


    it('can create actions as ephemeral data', function(){

        world.clear();

        var city1 = world.createChild();

        var d0 = world.action('ergo');
        var d1 = city1.data('ergo');

        d0.subscribe(callback);

        d0.write('0');
        d1.write('1');
//todo fix with .used
        assert.equal(d0.read(), undefined);
        // assert.equal(d0.peek(), null);
        // assert.equal(d1.peek().msg, '1');
        assert.equal(msgLog[0], '0');
        assert.equal(d1.read(), '1');

    });

    it('valves can restrict data in higher scopes', function(){


        world.clear();

        var city1 = world.createChild();
        var city2 = world.createChild();

        var d0 = world.data('ergo');
        var d1 = city1.data('ergo');
        var d2 = city2.data('proxy');

        var d3 = world.data('Re-L');
        world.valves = ['Re-L'];

        d0.write('0');
        d1.write('1');
        d2.write('2');
        d3.write('3');

        var f1 = city1.find('ergo');
        var f2 = city2.find('ergo');
        var f3 = city1.find('Re-L');
        var f4 = world.find('Re-L');
        var f5 = world.find('ergo');

        console.log('flat',Array.from(city2.flatten().keys()));
        assert.equal(f1.read(), '1'); // access never encounters valve above
        assert.equal(f2, null); // access blocked by valve
        assert.equal(f3.read(), '3'); // remote access through valve
        assert.equal(f4.read(), '3'); // local access through valve
        assert.equal(f5.read(), '0'); // local access despite valve (valves only block from below)

    });


    it('can create states for data that is read-only from below', function(){

        world.clear();

        var city1 = world.createChild();

        var d0 = world.state('ergo'); // creates a mirror under the hood
        var d1 = city1.data('proxy');

        d0.write('0');
        d1.write('1');

        var f1 = city1.find('ergo'); // from below, finds mirror as read-only
        var f2 = world.find('ergo'); // locally, finds data with write access

        f2.write('3'); // can write to state, affects both data and mirror

        assert.equal(f1.read(), '3');
        assert.equal(f2.read(), '3');
        assert.equal(f1.type, 'mirror');

        var writeToMirror = function(){ f1.write('4');};
        assert.throws(writeToMirror, Error);

    });


});


// todo add survey() test
// todo add silent transaction assertion
// todo add
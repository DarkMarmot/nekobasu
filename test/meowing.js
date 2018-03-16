//run mocha from project root

const assert = require('assert');
const Catbus = require('../dist/catbus.umd.js');

const root = Catbus.createChild();

let sourceLog;
let msgLog;


function callback(msg, source){

    console.log('msg is: ', msg, ' -- ', source);
    msgLog.push(msg);
    sourceLog.push(source);

}

let watcher = {};
watcher.tap = callback;
watcher.handle = callback;

watcher.toShield = function(msg, source){
    return 'shield';
};

watcher.addShield = function(msg, source){
    return msg + ' shield';
};



function resetLog(){

    sourceLog = [];
    msgLog = [];

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

        const d = world.demand('castle');
        const bus = world.bus().context(watcher).meow('castle * handle');

        d.write('knight');

        Catbus.flush();

        assert.equal(msgLog[0], 'knight');

    });

    it('can react to data synchronously', function(){

        const d = world.demand('castle');
        const bus = world.bus().context(watcher).meow('{ castle * handle');

        d.write('knight');

        assert.equal(msgLog[0], 'knight');

    });

    it('can react to multiple data synchronously', function(){

        const d1 = world.demand('castle');
        const d2 = world.demand('tower');
        const d3 = world.demand('bridge');

        const bus = world.bus().context(watcher).meow('{ castle, bridge, tower * handle');

        d1.write('knight');
        d1.write('paladin');
        d3.write('barbarian');
        d2.write('fighter');
        d1.write('crusader');

        assert.equal(sourceLog[0], 'castle');
        assert.equal(sourceLog[3], 'tower');
        assert.equal(sourceLog[4], 'castle');

        assert.equal(msgLog[0], 'knight');
        assert.equal(msgLog[3], 'fighter');
        assert.equal(msgLog[4], 'crusader');

    });

    it('can react to batched multiple data', function(){

        const d1 = world.demand('castle');
        const d2 = world.demand('tower');
        const d3 = world.demand('bridge');

        const bus = world.bus().context(watcher).meow('castle, bridge, tower * handle');

        d1.write('knight');
        d1.write('paladin');
        d3.write('barbarian');
        d2.write('fighter');
        d1.write('crusader');

        Catbus.flush();

        assert.equal(msgLog.length, 1);
        assert.equal(sourceLog.length, 1);
        assert.equal(msgLog[0].bridge, 'barbarian');

    });

    it('can react to batched multiple data with needs and options untouched', function(){

        const d1 = world.demand('castle');
        const d2 = world.demand('tower');
        const d3 = world.demand('bridge'); // unused intentionally

        const bus = world.bus().context(watcher).meow('castle?, bridge?, tower * handle');

        d1.write('knight');
        d1.write('paladin');
        d3.write('barbarian');
        d2.write('fighter');
        d3.write('assassin');
        d1.write('crusader');

        Catbus.flush();

        assert.equal(msgLog.length, 1);
        assert.equal(sourceLog.length, 1);
        assert.equal(msgLog[0].castle, 'crusader');
        assert.equal(msgLog[0].bridge, 'assassin');

    });

    it('can react to batched multiple data with needs and options used', function(){

        const d1 = world.demand('castle');
        const d2 = world.demand('tower');
        const d3 = world.demand('bridge'); // unused intentionally

        const bus = world.bus().context(watcher).meow('castle, bridge?, tower * handle');

        d1.write('knight');
        d1.write('paladin');
        d2.write('fighter');
        d1.write('crusader');

        Catbus.flush();

        assert.equal(msgLog.length, 1);
        assert.equal(sourceLog.length, 1);
        assert.equal(msgLog[0].castle, 'crusader');

    });

    it('can react to data and rename it', function(){

        const d = world.demand('castle');
        const bus = world.bus().context(watcher).meow('castle:tower * handle');
        d.write('knight');

        Catbus.flush();

        assert.equal(msgLog[0], 'knight');
        assert.equal(sourceLog[0], 'tower');

    });

    it('can react to multiple data synchronously and rename it', function(){

        const d1 = world.demand('castle');
        const d2 = world.demand('tower');
        const d3 = world.demand('bridge');

        const bus = world.bus().context(watcher).meow('{ castle:c, bridge:b, tower:t * handle');

        d1.write('knight');
        d1.write('paladin');
        d3.write('barbarian');
        d2.write('fighter');
        d1.write('crusader');

        assert.equal(sourceLog[0], 'c');
        assert.equal(sourceLog[3], 't');
        assert.equal(sourceLog[4], 'c');

        assert.equal(msgLog[0], 'knight');
        assert.equal(msgLog[3], 'fighter');
        assert.equal(msgLog[4], 'crusader');

    });

    it('can react to batched multiple data and rename it', function(){

        const d1 = world.demand('castle');
        const d2 = world.demand('tower');
        const d3 = world.demand('bridge');

        const bus = world.bus().context(watcher).meow('castle:c1, bridge:b2, tower:t3 * handle');

        d1.write('knight');
        d1.write('paladin');
        d3.write('barbarian');
        d2.write('fighter');
        d1.write('crusader');

        Catbus.flush();

        assert.equal(msgLog.length, 1);
        assert.equal(sourceLog.length, 1);
        assert.equal(msgLog[0].b2, 'barbarian');

    });


    it('can pull batched multiple data', function(){

        const d1 = world.demand('castle');
        const d2 = world.demand('tower');
        const d3 = world.demand('bridge');

        d1.write('knight');
        d1.write('paladin');
        d3.write('barbarian');
        d2.write('fighter');
        d1.write('crusader');

        const bus = world.bus().context(watcher)
            .meow('castle, bridge:b, tower * handle');

        bus.pull();

        Catbus.flush();

        assert.equal(msgLog.length, 1);
        assert.equal(sourceLog.length, 1);
        assert.equal(msgLog[0].b, 'barbarian');

    });

    it('can react and replace data', function(){

        const d = world.demand('castle');
        const bus = world.bus().context(watcher).meow('castle * toShield * handle');

        d.write('knight');

        Catbus.flush();

        assert.equal(msgLog[0], 'shield');

    });

    it('can react and transform data', function(){

        const d = world.demand('castle');
        const bus = world.bus().context(watcher).meow('castle * addShield * handle');

        d.write('knight');

        Catbus.flush();

        assert.equal(msgLog[0], 'knight shield');

    });

    it('can react and write data', function(){

        const d = world.demand('castle');
        const t = world.demand('tower');

        world.bus().context(watcher).meow('castle * addShield > tower');

        d.write('knight');

        Catbus.flush();

        assert.equal(t.read(), 'knight shield');

    });

    it('can extract properties from data', function(){

        const d = world.demand('castle');
        const bus = world.bus().context(watcher).meow('castle.armor * handle');

        d.write({armor: 'knight'});

        Catbus.flush();

        assert.equal(msgLog[0], 'knight');

    });

    it('can use filter hooks', function(){

        const d = world.demand('castle');
        const bus = world.bus().context(watcher).meow('{ castle # IF_TRUTHY * addShield * handle');

        d.write('knight');
        d.write(''); // skipped
        d.write('moo');

        Catbus.flush();

        assert.equal(msgLog[0], 'knight shield');
        assert.equal(msgLog.length, 2);

    });

    it('can use prior hooks', function(){

        const d = world.demand('castle');
        const bus = world.bus().context(watcher).meow('{ castle # PRIOR * addShield * handle');

        d.write('knight');
        d.write('yum'); // skipped
        d.write('moo');

        Catbus.flush();

        assert.equal(msgLog[0], 'knight shield');
        assert.equal(msgLog[1], 'yum shield');
        assert.equal(msgLog.length, 2);

    });



});

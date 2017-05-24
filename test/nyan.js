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

        const d = world.data('castle');
        const bus = world.react('castle | *handle', watcher);
        d.write('knight');

        assert.equal(msgLog[0], 'knight');

    });

    it('can react to data and rename it', function(){

        const d = world.data('castle');
        const bus = world.react('castle (tower) | *handle', watcher);
        d.write('knight');

        assert.equal(msgLog[0], 'knight');
        assert.equal(sourceLog[0], 'tower');
    });

    it('can react to data on a topic', function(){

        const d = world.data('cat');
        const bus = world.react('cat:whisker | *handle', watcher);
        d.write('wind', 'whisker');

        assert.equal(msgLog[0], 'wind');

    });

    it('can react to data on a topic and rename it', function(){

        const d = world.data('cat');
        const bus = world.react('cat:whisker(grr) | *handle', watcher);
        d.write('wind', 'whisker');

        assert.equal(msgLog[0], 'wind');
        assert.equal(sourceLog[0], 'grr');

    });

    it('can react to multi batched data', function(){

        const d1 = world.data('castle');
        const d2 = world.data('palace');

        const bus = world.react('castle, palace | *handle', watcher);
        d1.write('knight');
        d2.write('squire');

        Catbus.flush();

        assert.equal(msgLog[0].castle, 'knight');
        assert.equal(msgLog[0].palace, 'squire');

    });

    it('can react to multi batched data and rename it', function(){

        const d1 = world.data('castle');
        const d2 = world.data('palace');

        const bus = world.react('castle (cat), palace (dog) | *handle', watcher);
        d1.write('knight');
        d2.write('squire');

        Catbus.flush();

        assert.equal(msgLog[0].cat, 'knight');
        assert.equal(msgLog[0].dog, 'squire');


    });

    it('can react to multi batched data and rename the stream', function(){

        const d1 = world.data('castle');
        const d2 = world.data('palace');

        const bus = world.react('castle (cat), palace (dog) | (together) | *handle', watcher);
        d1.write('knight');
        d2.write('squire');

        Catbus.flush();

        assert.equal(msgLog[0].cat, 'knight');
        assert.equal(msgLog[0].dog, 'squire');
        assert.equal(sourceLog[0], 'together');

    });


    it('can pull prior multi batched data', function(){

        const d1 = world.data('castle');
        const d2 = world.data('palace');

        d1.write('wizard');
        d2.write('mage');

        const bus = world.react('castle, palace | *handle', watcher).pull();

        Catbus.flush();

        assert.equal(msgLog[0].castle, 'wizard');
        assert.equal(msgLog[0].palace, 'mage');

    });

    // it('can subscribe to dynamic topics', function(){
    //
    //     const d1 = world.data('books');
    //     const d2 = world.data('category');
    //
    //     d1.write(7, 'castles');
    //     d1.write(9, 'knights');
    //     d1.write(4, 'bunnies');
    //
    //     Stream s = Stream.
    //
    //     const bus = world.react('castle, palace | *handle', watcher).pull();
    //
    //     Catbus.flush();
    //
    //     assert.equal(msgLog[0].castle, 'wizard');
    //     assert.equal(msgLog[0].palace, 'mage');
    //
    // });

    it('can react', function(){

            var d = world.data('ergo');

            d.write('meow');
            const bus = world.react('ergo | *handle', watcher).pull();

            var name = d.name;
            assert.equal(name, 'ergo');

        });


    it('can react2', function(){


        var d = world.data('ergo');

        d.write('fish');
        d.write('cow');
        const bus = world.react('ergo | *handle', watcher).pull();
        d.write('bunny');

        //bus.run(watcher.handle);





        var name = d.name;
        assert.equal(name, 'ergo');

    });


    it('can react2', function(){


        var d1 = world.data('village');
        var d2 = world.data('forest');

        d1.write('fish');
        d2.write('cow');
        const bus = world.react('village(grey), forest(green) | *handle', watcher).pull();
        d2.write('bunny');

        //bus.run(watcher.handle);


        var name = d1.name;
        assert.equal(name, 'village');

    });

    it('can react3', function(){


        var d1 = world.data('village');
        var d2 = world.data('forest');
        var d3 = world.data('sea');
        var d4 = world.data('grove');

        d1.write('fish');
        d2.write({moo: {spot: 5}});
        d3.write('dog');
        d4.write('mushroom');

        const bus = world.react('forest.moo.spot?(green) | &sea, grove(cave) | (poo) | *handle', watcher).pull();
        d2.write({moo: {spot: 5}});
        // d2.write('sunset');
        //bus.run(watcher.handle);


        var name = d1.name;
        assert.equal(name, 'village');

    });

    it('can write to data', function(){


        var d1 = world.data('village');
        var d2 = world.data('forest');
        var d3 = world.data('sea');
        var d4 = world.data('grove');

        d1.write('fish');
        d2.write({moo: {spot: 5}});
        d3.write('dog');
        d4.write('mushroom');

        const bus = world.react('forest.moo.spot?(green) | &sea, grove(cave) | (poo) | =village', watcher).pull();
        d2.write({moo: {spot: 5}});
        // d2.write('sunset');
        //bus.run(watcher.handle);

        console.log('is', d1.read());
        var name = d1.name;
        assert.equal(name, 'village');

    });

    it('can write to data', function(){


        var d1 = world.data('village');
        var d2 = world.data('forest');
        var d3 = world.data('sea');
        var d4 = world.data('grove');

        d1.write('fish');
        d2.write({moo: {spot: 5}});
        d3.write('dog');
        d4.write('mushroom');

        const bus = world.react('forest.moo.spot?(green) | & sea, grove(cave) | (poo) | < village(green),grove:bunny(cave) ', watcher).pull();
        d2.write({moo: {spot: 5}});
        // d2.write('sunset');
        //bus.run(watcher.handle);
        console.log('vis', d1.read());
        console.log('is', d4.read('bunny'));
        var name = d1.name;
        assert.equal(name, 'village');

    });


    it('can write to datab', function(){




        var d1 = world.data('village');
        var d2 = world.data('forest');
        var d3 = world.data('sea');
        var d4 = world.data('grove');

        d1.write('fish');
        d2.write({moo: {spot: 5}});
         // d3.write('dog');
        d4.write('mushroom');

        const bus = world.react('forest (green), sea!  { (tooth) | sea -} | &sea, grove(cave) | (poo) | =village', watcher).pull();
        // const bus = world.react('forest!, sea | *handle', watcher).pull();

        d3.write('dog');
        Catbus.flush();
        // Catbus.flush();

        console.log('is', d1.read(), msgLog);
        var name = d1.name;
        assert.equal(name, 'village');

    });


    it('can write to datac', function(){


        var d1 = world.data('village');
        var d2 = world.data('forest');
        var d3 = world.data('sea');
        var d4 = world.data('grove');

        d1.write('fish');
        d2.write({moo: {spot: 5}});
        // d3.write('dog');
        d4.write('mushroom');

        const bus = world.react('forest (green), sea!  { (tooth) | `string { does ! rock } bunny be happy` -} | &sea, grove(cave) | (poo) | =village:grr', watcher).pull();
        // const bus = world.react('forest!, sea | *handle', watcher).pull();

        d3.write('dog');
        Catbus.flush();
        // Catbus.flush();

        console.log('is', d1.read(), msgLog);

        console.log('gr', d1.read('grr'), msgLog);

        var name = d1.name;
        assert.equal(name, 'village');


    });

    //     it('can write data', function(){
    //
    //         var d = world.data('ergo');
    //         d.write('proxy');
    //         var value = d.read();
    //
    //         assert.equal(value, 'proxy');
    //
    //     });
    //
    //     it('can modify data', function(){
    //
    //         var d = world.data('ergo');
    //         d.write('autoreiv');
    //         var value = d.read();
    //
    //         assert.equal(value, 'autoreiv');
    //
    //     });
    //
    //
    //
    //     it('can toggle data', function(){
    //
    //         var d = world.data('ergo');
    //         d.write('wasteland');
    //         d.toggle();
    //         assert.equal(d.read(), false);
    //         d.toggle();
    //         assert.equal(d.read(), true);
    //         d.toggle();
    //         assert.equal(d.read(), false);
    //
    //     });
    //
    //
    //     it('can subscribe to data via callbacks', function(){
    //
    //         var d = world.data('ergo');
    //         d.subscribe(callback);
    //         d.write('Re-L');
    //         var value = msgLog[0];
    //         assert.equal(value, 'Re-L');
    //
    //     });
    //
    // it('can subscribe to data via watchers', function(){
    //
    //     const d = world.data('pond');
    //     d.subscribe(new Watcher('cow'));
    //     d.write('turtle');
    //
    //     assert.equal(msgLog[0], 'turtle');
    //     assert.equal(contextLog[0].name, 'cow');
    //
    //
    // });
    //
    // it('can follow existing data via watchers', function(){
    //
    //     const d = world.data('pond');
    //     d.write('kitten');
    //     d.write('bunny');
    //     d.follow(new Watcher('cow'));
    //     d.write('turtle');
    //
    //     assert.equal(msgLog[1], 'turtle');
    //     assert.equal(contextLog[0].name, 'cow');
    //
    //
    // });
    //
    // it('can unsubscribe to data', function(){
    //
    //     console.log('dropped', msgLog);
    //
    //     console.log('world', world._dataList.size);
    //
    //     var d = world.data('ergo');
    //
    //     console.log('is', d.read());
    //
    //     d.subscribe(callback);
    //     d.write('Re-L');
    //     d.unsubscribe(callback);
    //     d.write('Vincent');
    //     d.subscribe(callback);
    //     d.write('Proxy');
    //     console.log('dropped', msgLog);
    //     var value = msgLog[0];
    //     assert.equal(value, 'Re-L');
    //     value = msgLog[1];
    //     assert.equal(value, 'Proxy');
    //
    // });
    //
    //
    // it('can refresh existing data', function(){
    //
    //     world.clear();
    //     var d = world.data('ergo');
    //     d.subscribe(callback);
    //     d.write('Vincent');
    //     d.write('Re-L');
    //     d.refresh();
    //
    //     var lastValue = msgLog[2];
    //     assert.equal(lastValue, 'Re-L');
    //     assert.equal(msgLog.length, 3);
    //
    // });
    //
    //     it('can subscribe to topics', function(){
    //
    //         world.clear();
    //         var d = world.data('ergo');
    //         d.subscribe(callback, 'arcology');
    //         d.write('Vincent', 'character');
    //         d.write('Re-L', 'character');
    //         d.write('Romdeau', 'arcology');
    //         d.write('wasteland');
    //
    //         var value = msgLog[0];
    //         assert.equal(value, 'Romdeau');
    //         assert.equal(msgLog.length, 1);
    //
    //     });
    //
    // it('can drop subscriptions to topics', function(){
    //
    //     world.clear();
    //     var d = world.data('ergo');
    //     d.subscribe(callback, 'arcology');
    //     d.write('Vincent', 'character');
    //     d.write('Re-L', 'character');
    //     d.write('Romdeau', 'arcology');
    //     d.write('wasteland');
    //     d.unsubscribe(callback, 'arcology');
    //     d.write('Vincent', 'arcology');
    //
    //     var value = msgLog[0];
    //     assert.equal(value, 'Romdeau');
    //     assert.equal(msgLog.length, 1);
    //
    // });
    //
    // it('can read data by topic', function(){
    //
    //     world.clear();
    //     var d = world.data('ergo');
    //
    //     d.write('Vincent', 'character');
    //     d.write('Re-L', 'character');
    //     d.write('Romdeau', 'arcology');
    //     d.write('wasteland');
    //
    //     assert.equal(d.read('arcology'), 'Romdeau');
    //     assert.equal(d.read('character'), 'Re-L');
    //     assert.equal(d.read(), 'wasteland');
    //
    //
    // });
    //
    // it('can peek at packets by topic', function(){
    //
    //     world.clear();
    //     var d = world.data('ergo');
    //
    //     d.write('Vincent', 'character');
    //     d.write('Re-L', 'character');
    //     d.write('Romdeau', 'arcology');
    //     d.write('wasteland');
    //
    //     assert.equal(d.peek('arcology').msg, 'Romdeau');
    //     assert.equal(d.peek('arcology').source, 'ergo');
    //     assert.equal(d.peek('character').topic, 'character');
    //     assert.equal(d.peek().topic, null);
    //
    //
    // });
    //
    //     it('can monitor all topics', function(){
    //
    //         world.clear();
    //         var d = world.data('ergo');
    //         d.monitor(callback);
    //         d.write('Vincent', 'character');
    //         d.write('Re-L', 'character');
    //         d.write('Romdeau', 'arcology');
    //         d.write('wasteland');
    //
    //         var value = msgLog[2];
    //         var topic = packetLog[1].topic;
    //         assert.equal(value, 'Romdeau');
    //         assert.equal(topic, 'character');
    //         assert.equal(msgLog.length, 4);
    //
    //     });
    //
    // it('creates child scopes', function(){
    //
    //     world.clear();
    //
    //     var city1 = world.createChild();
    //     var city2 = world.createChild();
    //
    //     var d0 = world.data('ergo');
    //     var d1 = city1.data('ergo');
    //     var d2 = city2.data('proxy');
    //
    //     d0.write('0');
    //     d1.write('1');
    //     d2.write('2');
    //
    //     assert.equal(d0.read(), '0');
    //     assert.equal(d1.read(), '1');
    //     assert.equal(d2.read(), '2');
    //
    // });
    //
    // it('finds data in higher scopes', function(){
    //
    //     world.clear();
    //
    //     var city1 = world.createChild();
    //     var city2 = world.createChild();
    //
    //     var d0 = world.data('ergo');
    //     var d1 = city1.data('ergo');
    //     var d2 = city2.data('proxy');
    //
    //     d0.write('0');
    //     d1.write('1');
    //     d2.write('2');
    //
    //     var f1 = city1.find('ergo');
    //     var f2 = city2.find('ergo');
    //
    //     assert.equal(f1.read(), '1');
    //     assert.equal(f2.read(), '0');
    //
    // });
    //
    // it('can write transactions', function(){
    //
    //     resetLog();
    //     world.clear();
    //
    //     var city1 = world.createChild();
    //
    //     var d0 = world.data('proxy');
    //     var d1 = city1.data('ergo');
    //     var d2 = city1.data('autoreiv');
    //
    //     var result;
    //
    //     d0.subscribe(function(msg){
    //         result = msg;
    //         assert(d0.read(), 'grey');
    //         assert(d1.read(), 'black');
    //         assert(d2.read(), 'chrome');
    //     });
    //
    //     city1.transaction([
    //         {name: 'proxy', value: 'grey'},
    //         {name: 'ergo', value: 'black'},
    //         {name: 'autoreiv', value: 'chrome'}
    //     ]);
    //
    //     assert(result, 'grey');
    //
    //
    // });
    //
    //
    // it('can create actions as ephemeral data', function(){
    //
    //     world.clear();
    //
    //     var city1 = world.createChild();
    //
    //     var d0 = world.action('ergo');
    //     var d1 = city1.data('ergo');
    //
    //     d0.subscribe(callback);
    //
    //     d0.write('0');
    //     d1.write('1');
    //
    //     assert.equal(d0.read(), undefined);
    //     assert.equal(d0.peek(), null);
    //     assert.equal(d1.peek().msg, '1');
    //     assert.equal(msgLog[0], '0');
    //     assert.equal(d1.read(), '1');
    //
    // });
    //
    // it('valves can restrict data in higher scopes', function(){
    //
    //
    //     world.clear();
    //
    //     var city1 = world.createChild();
    //     var city2 = world.createChild();
    //
    //     var d0 = world.data('ergo');
    //     var d1 = city1.data('ergo');
    //     var d2 = city2.data('proxy');
    //
    //     var d3 = world.data('Re-L');
    //     world.valves = ['Re-L'];
    //
    //     d0.write('0');
    //     d1.write('1');
    //     d2.write('2');
    //     d3.write('3');
    //
    //     var f1 = city1.find('ergo');
    //     var f2 = city2.find('ergo');
    //     var f3 = city1.find('Re-L');
    //     var f4 = world.find('Re-L');
    //     var f5 = world.find('ergo');
    //
    //     console.log('flat',Array.from(city2.flatten().keys()));
    //     assert.equal(f1.read(), '1'); // access never encounters valve above
    //     assert.equal(f2, null); // access blocked by valve
    //     assert.equal(f3.read(), '3'); // remote access through valve
    //     assert.equal(f4.read(), '3'); // local access through valve
    //     assert.equal(f5.read(), '0'); // local access despite valve (valves only block from below)
    //
    // });
    //
    //
    // it('can create states for data that is read-only from below', function(){
    //
    //     world.clear();
    //
    //     var city1 = world.createChild();
    //
    //     var d0 = world.state('ergo'); // creates a mirror under the hood
    //     var d1 = city1.data('proxy');
    //
    //     d0.write('0');
    //     d1.write('1');
    //
    //     var f1 = city1.find('ergo'); // from below, finds mirror as read-only
    //     var f2 = world.find('ergo'); // locally, finds data with write access
    //
    //     f2.write('3'); // can write to state, affects both data and mirror
    //
    //     assert.equal(f1.read(), '3');
    //     assert.equal(f2.read(), '3');
    //     assert.equal(f1.type, 'mirror');
    //
    //     var writeToMirror = function(){ f1.write('4');};
    //     assert.throws(writeToMirror, Error);
    //
    // });


});


// todo add survey() test
// todo add silent transaction assertion
// todo add

const Catbus = require('./public/js/catbus.umd.js');

const world = Catbus.createChild();

const d = world.data('castle');
const e = world.data('moo');


const arr = [];
for(let i = 0; i < 1000000; i++){
    arr.push(i);
}


const fs = {
    add1: function(x) { return x + 1; },
    even: function(x) { return x % 2 === 0;},
    sum: function(x, y) { return x + y;}
};

const b = world.bus('~castle').split().process(' >even | *add1', fs).scan(fs.sum, 0);//.process('=moo');

const n = Date.now();

for(let i = 0; i < 170; i++) {

    d.write(arr);
    b._frames[0].streams[0].reset();
    //console.log('e', e.read());

}

console.log('t', Date.now() - n);

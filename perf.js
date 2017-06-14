
const Catbus = require('./public/js/catbus.umd.js');

const world = Catbus.createChild();

const d = world.data('castle');
const e = world.data('moo');

const fs = {

    add1: function(x) { return x + 1; },
    even: function(x) { return x % 2 === 0;},


};

function sum(x, y) { return x + y;}

const arr = [];
for(let i = 0; i < 1000000; i++){
    arr.push(i);
}


const b = world.bus('~castle').split().process(' >even | *add1', fs).scan(sum).process('=moo');

const n = new Date();

for(let j = 0; j < 10; j++) {
    d.write(arr);
}


console.log('e', e.read());

console.log('t', new Date() - n);
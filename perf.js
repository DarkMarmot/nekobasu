
const Catbus = require('./public/js/catbus.umd.js');

const world = Catbus.createChild();

const d = world.demand('castle');
const e = world.demand('moo');


const arr = [];
for(let i = 0; i < 1000000; i++){
    arr.push(i);
}

// const a2 = new Array(1000000);
// for(let i = 0, j = 0; i< a2.length; i+=2, ++j) {
//     a2[i] = a2[i+1] = j;
// }

const fs = {
    add1: function(x) { return x + 1; },
    even: function(x) { return x % 2 === 0;},
    sum: function(x, y) { return x + y;}
};

function add1(x) { return x + 1; }
function even(x) { return x % 2 === 0;}
function sum(x, y) { return x + y;}

let answer;

function Answer(){
    this.value = 0;
}

let r;
function moo(d){
  r = d;
}

Answer.prototype.got = function(d){
    this.value = d;
};


//const b = world.bus('~castle').split().process(' >even | *add1', fs).scan(fs.sum, 0);//.process('=moo');

 // const b = world.bus('~castle').split().filter(even).msg(add1).scan(sum, 0).process('=moo');
//const b = world.bus('~castle').split().skipDupes().scan(sum, 0).run(moo);

//const b = world.bus('~castle').spork().filter(even).msg(add1).reduce(sum, 0).process('=moo');

// const b = world.bus('~castle').spork().skipDupes().reduce(sum, 0).msg(function(){});

//const b = world.bus('~castle').spork().skip(250000).take(500000).reduce(sum, 0).process('=moo');
//
// var streams = [[1,2],[2,5],[3,9]].map(Catbus.fromValue);
// const c = Catbus.fromValues(streams);
// c.forge(); // multiple streams, split, merged -> ready for reduce
// c.scan(sum, 0);
// streams.forEach(function(s){ s.pull();});

// const b = Catbus.fromValue(arr).spork().skip(250000).take(500000).reduce(sum, 0);//.msg(function(){});

const b = Catbus.fromValue(arr).spork().filterMap(even, add1).reduce(sum, 0).msg(function(){});


 // const buses = [];
// for(let i = 0; i < 1000; i++) {
//     const b = world.bus('~castle').split();//.process('=moo');
//     buses.push(b);
// }

// const b = Catbus.bus().addMany(buses);
// b.scan(sum, 0);

const n = Date.now();

for(let i = 0; i < 150; i++) {

//dt.handle(arr);

    b.pull();

   // setTimeout(runit, 0);

    //Promise.resolve().then(ff);

    //console.log(i);
    //console.log(r);
   //  console.log('e', e.read());
   // console.log(b._frame s[b._frames.length - 1].streams[0].value);
  //   b._frames[b._frames.length - 2].streams[0].value = 0;

}

console.log(e.read());

console.log('t',  Date.now() - n);



const Catbus = require('./public/js/catbus.umd.js');

const world = Catbus.createChild();

const d = world.data('castle');
const e = world.data('moo');


const arr = [];
for(let i = 0; i < 1000000; i++){
    arr.push(i);
}

// const arr = new Array(1000000);
// for(let i = 0, j = 0; i< arr.length; i+=2, ++j) {
//     arr[i] = arr[i+1] = j;
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

function moo(d){

}

Answer.prototype.got = function(d){
    this.value = d;
};


//const b = world.bus('~castle').split().process(' >even | *add1', fs).scan(fs.sum, 0);//.process('=moo');

 const b = world.bus('~castle').split().filter(even).msg(add1).scan(sum, 0).process('=moo');
// const buses = [];
// for(let i = 0; i < 1000; i++) {
//     const b = world.bus('~castle').split();//.process('=moo');
//     buses.push(b);
// }

// const b = Catbus.bus().addMany(buses);
// b.scan(sum, 0);

const n = Date.now();
const dt = d.dataTopic();
let ii = 0;

function runit(){
    dt.handle(arr);
    ii++;
    //console.log('moo!', ii);

}
function ff(){
    dt.handle(arr);
    console.log('t',  Date.now() - n);
}
for(let i = 0; i < 160; i++) {

   // setTimeout(runit, 0);
    dt.handle(arr);
    //Promise.resolve().then(ff);

    console.log(i);
     console.log('e', e.read());
  //  console.log(b._frames[b._frames.length - 1].streams[0].value);
     b._frames[b._frames.length - 2].streams[0].value = 0;

}


console.log('t',  Date.now() - n);



import Scope from './scope.js';
import Stream from './stream.js';
import Bus from './bus.js';
import Nyan from './nyan.js';


const Catbus = {};

let _batchQueue = [];
let _primed = false;



Catbus.fromEvent = function(target, eventName, useCapture){

    const stream = Stream.fromEvent(target, eventName, useCapture);
    return new Bus(null, [stream]);

};


Catbus.enqueue = function(pool){

    _batchQueue.push(pool);

    if(!_primed) { // register to flush the queue
        _primed = true;
        if (typeof window !== 'undefined' && window.requestAnimationFrame) requestAnimationFrame(Catbus.flush);
        else process.nextTick(Catbus.flush);
    }

};


Catbus.scope = function(name){

    console.log('NYAN');
    const k = Nyan.parse('^bunny?:error(badbunny), !cow:(huh), _moo2?(meow) | %kitten' +
        '                       {*toMuffin | =order {=raw}} =meow {you} =woo');

    for(const cmd of k){
        console.log('CMD: ', cmd.name);
        const phrase = cmd.phrase;
        if(!phrase)
            continue;
        for(const word of phrase){
            console.log(word.name, word.operation, word.maybe);
        }
    }

    console.log(k);

    console.log('root is ', name);
    return new Scope(name);

};


Catbus.flush = function(){

    _primed = false;

    let cycles = 0;
    let q = _batchQueue;
    _batchQueue = [];

    while(q.length) {

        while (q.length) {
            const pool = q.shift();
            pool.release();
        }

        q = _batchQueue;
        _batchQueue = [];

        cycles++;
        if(cycles > 10)
            throw new Error('Flush batch cycling loop > 10.', q);

    }

};



export default Catbus;

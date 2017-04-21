
import Scope from './scope.js';
import Stream from './stream.js';
import Bus from './bus.js';

const Catbus = {};
let _batchQueue = [];


Catbus.fromEvent = function(target, eventName, useCapture){

    const stream = Stream.fromEvent(target, eventName, useCapture);
    return new Bus([stream]);

};


Catbus.enqueue = function(pool){
    _batchQueue.push(pool);
};

Catbus.scope = function(name){
    console.log('root is ', name);
    return new Scope(name);
};

Catbus.flush = function(){

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

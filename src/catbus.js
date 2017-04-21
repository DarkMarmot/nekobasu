
import Scope from './scope.js';
import Stream from './stream.js';
import Bus from './bus.js';

const Catbus = {};
let _batchQueue = [];


Catbus.fromEvent = function(target, eventName, useCapture){

    const stream = Stream.fromEvent(target, eventName, useCapture);
    return new Bus([stream]);

};


Catbus.enqueue = function(stream){
    _batchQueue.push(stream);
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
                const stream = q.shift();
                stream.fireContent();
            }

            q = _batchQueue;
            _batchQueue = [];

            cycles++;
            if(cycles > 10)
                throw new Error('Flush batch cycling loop > 10.', q);

        }

};



export default Catbus;

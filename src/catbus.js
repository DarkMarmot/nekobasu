
import Scope from './scope.js';
import EventSource from './sources/eventSource.js';
import IntervalSource from './sources/intervalSource.js';
import SubscribeSource from './sources/subscribeSource.js';
import ValueSource from './sources/valueSource.js';
import ArraySource from './sources/arraySource.js';

import Bus from './bus.js';


const Catbus = {};

let _batchQueue = [];
let _primed = false;

Catbus.bus = function(){
    return new Bus();
};


Catbus.fromInterval = function(name, delay, msg){

    const bus = new Bus();
    const source = new IntervalSource(name, delay, msg);
    bus.addSource(source);

    return bus;

};

Catbus.fromEvent = function(target, eventName, useCapture){

    const bus = new Bus();
    const source = new EventSource(eventName, target, eventName, useCapture);
    bus.addSource(source);

    return bus;

};

Catbus.fromValues = function(values){

    const bus = new Bus();
    const len = values.length;
    for(let i = 0; i < len; ++i) {
        const source = new ValueSource('', value);
        bus.addSource(source);
    }
    return bus;

};

Catbus.fromArray = function(arr, name){

    return Catbus.fromValue(arr, name).split();

};

Catbus.fromValue = function(value, name){

    const bus = new Bus();
    const source = new ValueSource(name || '', value);
    bus.addSource(source);

    return bus;

};


Catbus.fromSubscribe = function(name, data, topic){

    const bus = new Bus();
    const source = new SubscribeSource(name, data, topic, true);
    bus.addSource(source);

    return bus;

};


// todo stable output queue -- output pools go in a queue that runs after the batch q is cleared, thus run once only

Catbus.enqueue = function(pool){

    _batchQueue.push(pool);

    if(!_primed) { // register to flush the queue
        _primed = true;
        if (typeof window !== 'undefined' && window.requestAnimationFrame) requestAnimationFrame(Catbus.flush);
        else process.nextTick(Catbus.flush);
    }

};


Catbus.createChild = Catbus.scope = function(name){

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
            pool.emit();
        }

        q = _batchQueue;
        _batchQueue = [];

        cycles++;
        if(cycles > 10)
            throw new Error('Flush batch cycling loop > 10.', q);

    }

};



export default Catbus;


import NOOP_SOURCE from './noopSource.js';
import PassStream from '../streams/passStream.js';


const FUNCTOR = function(d) {
    return typeof d === 'function' ? d : function(d) { return d;};
};

function callback(source){

    const n = source.name;
    const msg = source.msg();
    this.stream.handle(msg, n, null);

}

function IntervalSource(name, delay, msg) {

    this.name = name;
    this.delay = delay;
    this.dead = false;
    this.stream = new PassStream(name);
    this.intervalId = setInterval(callback, delay, this);;
    this.msg = FUNCTOR(msg);

}

IntervalSource.prototype.destroy = function destroy(){
    clearInterval(this.intervalId);
    this.dead = true;
};


NOOP_SOURCE.addStubs(IntervalSource);


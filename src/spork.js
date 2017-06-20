
import NOOP_STREAM from './streams/noopStream.js';
import ReduceStream from './streams/reduceStream.js';
import MsgStream from './streams/msgStream.js';
import FilterStream from './streams/filterStream.js';
import SkipStream from './streams/skipStream.js';
import SkipNStream from './streams/skipNStream.js';
import TakeNStream from './streams/takeNStream.js';


function Spork(bus) {

    this.bus = bus;
    this.streams = [];
    this.first = NOOP_STREAM;
    this.last = NOOP_STREAM;
    this.initialized = false;

}

Spork.prototype.handle = function(msg, topic, source) {

    this.first.reset();
    this._split(msg, source, topic);
    this.next.handle(this.last.v, source, topic);

};


Spork.prototype.withArray = function withArray(msg, source, topic){

    const len = msg.length;

    for(let i = 0; i < len; i++){
        this.first.handle(msg[i], source, topic);
    }

};

Spork.prototype.withIteration = function withIteration(msg, source, topic){

    const first = this.first;
    for(const i of msg){
        first.handle(i, source, topic);
    }

};

Spork.prototype._split = function(msg, source, topic){

    if(Array.isArray(msg)){
        this.withArray(msg, source, topic);
    } else {
        this.withIteration(msg, source, topic);
    }

};

Spork.prototype._extend = function(stream) {

    if(!this.initialized){
        this.initialized = true;
        this.first = stream;
        this.last = stream;
    } else {
        this.streams.push(stream);
        this.last.next = stream;
        this.last = stream;
    }

};

Spork.prototype.msg = function msg(f) {
    this._extend(new MsgStream('', f));
    return this;
};

Spork.prototype.skipDupes = function skipDupes() {
    this._extend(new SkipStream(''));
    return this;
};

Spork.prototype.skip = function skip(n) {
    this._extend(new SkipNStream('', n));
    return this;
};

Spork.prototype.take = function take(n) {
    this._extend(new TakeNStream('', n));
    return this;
};


Spork.prototype.reduce = function reduce(f, seed) {
    this._extend(new ReduceStream('', f, seed));
    this.bus._spork = null;
    return this.bus;
};

Spork.prototype.filter = function filter(f) {
    this._extend(new FilterStream('', f));
    return this;
};

export default Spork;
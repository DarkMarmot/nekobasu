
import NOOP_STREAM from './noopStream.js';

const FUNCTOR = function(d) {
    return typeof d === 'function' ? d : function() { return d;};
};

function IMMEDIATE(msg, source) { return 0; }

function callback(stream, msg, source){
    const n = stream.name || source;
    stream.next.handle(msg, n);
}

function DelayStream(name, f) {

    this.name = name;
    this.f = arguments.length ? FUNCTOR(f) : IMMEDIATE;
    this.next = NOOP_STREAM;

}

DelayStream.prototype.handle = function handle(msg, source) {

    const delay = this.f(msg, source);
    setTimeout(callback, delay, this, msg, source);

};

NOOP_STREAM.addStubs(DelayStream);

export default DelayStream;



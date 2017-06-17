
import NOOP_STREAM from './noopStream.js';

const FUNCTOR = function(d) {
    return typeof d === 'function' ? d : function() { return d;};
};

function ScanStream(name, f, seed) {

    this.name = name;
    this.f = f;
    this.seed = FUNCTOR(seed);
    this.hasSeed = arguments.length === 3;
    this.hasValue = this.hasSeed || false;
    this.next = NOOP_STREAM;
    this.topic = undefined;
    this.msg = this.seed();

}

ScanStream.prototype.handle = function handle(msg, source, topic) {

    const hasValue = this.hasValue;

    if(!hasValue){
        this.msg = msg;
        this.hasValue = true;
    } else {
        const f = this.f;
        this.msg = f(this.msg, msg, source, topic);
    }

    const m = this.msg;
    this.next.handle(m, source, topic);

};

ScanStream.prototype.reset = function reset(msg) {

    const m = this.msg = this.seed(msg);
    this.topic = undefined;
    this.next.reset(m);

};

NOOP_STREAM.addStubs(ScanStream);


export default ScanStream;



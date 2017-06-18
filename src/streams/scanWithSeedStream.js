
import NOOP_STREAM from './noopStream.js';

const FUNCTOR = function(d) {
    return typeof d === 'function' ? d : function() { return d;};
};

function ScanWithSeedStream(name, f, seed, context) {

    this.name = name;
    this.f = f;
    this.seed = FUNCTOR(seed);
    this.context = context || null;
    this.next = NOOP_STREAM;
    this.value = this.seed();

}



ScanWithSeedStream.prototype.handle = function scanWithSeedHandle(msg, source, topic) {

    this.value = this.f.call(this.context, this.value, msg, source, topic);
    this.next.handle(this.value, source, topic);

};

ScanWithSeedStream.prototype.reset = function reset(msg) {

    const v = this.value = this.seed(msg);
    this.next.reset(v);

};

NOOP_STREAM.addStubs(ScanWithSeedStream);


export default ScanWithSeedStream;

// const scanStreamBuilder = function(f, seed) {
//     const hasSeed = arguments.length === 2;
//     return function(name) {
//         return hasSeed? new ScanWithSeedStream(name, f, seed) : new ScanStream(name, f);
//     }
// };


import NOOP_STREAM from './noopStream.js';


function FUNCTOR(d) {
    return typeof d === 'function' ? d : function() { return d; };
}

function ReduceStream(name, f, seed) {

    this.name = name;
    this.seed = FUNCTOR(seed);
    this.v = this.seed() || 0;
    this.f = f;
    this.next = NOOP_STREAM;

}


ReduceStream.prototype.reset = function(){

    this.v = this.seed() || 0;
    this.next.reset();

};

ReduceStream.prototype.handle = function(msg, topic, source){

    const f = this.f;
    this.v = f(msg, this.v);

};

NOOP_STREAM.addStubs(ReduceStream);

export default ReduceStream;




import NOOP_STREAM from './noopStream.js';

function BY_SOURCE(msg, source, topic) { return source; }

const FUNCTOR = function(d) {
    return typeof d === 'function' ? d : function() { return d;};
};

function GroupStream(name, f, seed) {

    this.name = name;
    this.f = f || BY_SOURCE;
    this.seed = arguments.length === 3 ? FUNCTOR(seed) : FUNCTOR({});
    this.next = NOOP_STREAM;
    this.topic = undefined;
    this.msg = this.seed();

}

GroupStream.prototype.handle = function handle(msg, source, topic) {

    const f = this.f;
    const v = f(msg, source, topic);
    const n = this.name || source;
    const m = this.msg;

    if(v){
        m[v] = msg;
    } else {
        for(const k in msg){
            m[k] = msg[k];
        }
    }

    this.next.handle(m, n, topic);

};

GroupStream.prototype.reset = function reset(msg) {

    const m = this.msg = this.seed(msg);
    this.topic = undefined;
    this.next.reset(m);

};


export default GroupStream;



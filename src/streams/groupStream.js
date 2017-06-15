
import NOOP_STREAM from './noopStream.js';

function BY_SOURCE(msg, source, topic) { return source; }


function GroupStream(name) {

    this.name = name;
    this.f = BY_SOURCE;
    this.next = NOOP_STREAM;
    this.topic = undefined;
    this.msg = {};

}

GroupStream.prototype.handle = function handle(msg, source, topic) {

    const f = this.f;
    const v = f(msg, source, topic);
    const n = this.name;
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

GroupStream.prototype.reset = function reset() {

    this.msg = {};
    this.topic = undefined;
    this.next.reset();

};


export default GroupStream;



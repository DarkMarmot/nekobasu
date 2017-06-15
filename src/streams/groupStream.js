
import NOOP_STREAM from './noopStream.js';

function BY_SOURCE(msg, source, topic) { return source; }


function GroupStream(name) {

    this.name = name;
    this.f = BY_SOURCE;
    this.next = NOOP_STREAM;
    this.hasValue = false;
    this.topic = undefined;
    this.msg = {};

}

GroupStream.prototype.handle = function handle(msg, source, topic) {

    const f = this.f;
    const v = f(msg, source, topic);
    const n = this.name;

    this.next.handle(v, n, topic);

};

export default GroupStream;



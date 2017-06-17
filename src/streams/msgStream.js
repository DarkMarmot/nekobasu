
import NOOP_STREAM from './noopStream.js';

function IDENTITY(msg, source, topic) { return msg; }


function MsgStream(name, f) {

    this.name = name;
    this.f = f || IDENTITY;
    this.next = NOOP_STREAM;

}

MsgStream.prototype.handle = function handle(msg, source, topic) {

    const f = this.f;
    const v = f(msg, source, topic);
    const n = this.name || source;

    this.next.handle(v, n, topic);

};

export default MsgStream;



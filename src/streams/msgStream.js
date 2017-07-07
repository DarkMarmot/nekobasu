
import NOOP_STREAM from './noopStream.js';

function IDENTITY(msg, source, topic) { return msg; }


function MsgStream(name, f) {

    this.name = name;
    this.f = f || IDENTITY;
    this.next = NOOP_STREAM;

}


MsgStream.prototype.handle = function msgHandle(msg, source, topic) {

    const f = this.f;
    this.next.handle(f(msg, source, topic), source, topic);

};

NOOP_STREAM.addStubs(MsgStream);

export default MsgStream;



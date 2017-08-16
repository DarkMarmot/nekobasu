
import NOOP_STREAM from './noopStream.js';

function IDENTITY(msg, source, topic) { return msg; }


function MsgStream(name, f, context) {

    this.name = name;
    this.f = f || IDENTITY;
    this.context = context;
    this.next = NOOP_STREAM;

}


MsgStream.prototype.handle = function msgHandle(msg, source, topic) {

    const f = this.f;
    this.next.handle(f.call(this.context, msg, source, topic), source, topic);

};

NOOP_STREAM.addStubs(MsgStream);

export default MsgStream;



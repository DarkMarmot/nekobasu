
import NOOP_STREAM from './noopStream.js';

function IDENTITY(msg, source, topic) { return msg; }


function MsgStream(name, f, context) {

    this.name = name;
    this.f = f || IDENTITY;
    this.context = context || null;
    this.next = NOOP_STREAM;

}

MsgStream.prototype.handle = function handle(msg, source, topic) {

    const f = this.f;
    const v = f.call(this.context, msg, source, topic);

    this.next.handle(v, source, topic);

};

NOOP_STREAM.addStubs(MsgStream);

export default MsgStream;



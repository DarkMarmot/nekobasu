
import NOOP_STREAM from './noopStream.js';

function IDENTITY(msg, source, topic) { return msg; }


function PassStream(name) {

    this.name = name || '';
    this.next = NOOP_STREAM;

}

PassStream.prototype.handle = function passHandle(msg, source, topic) {

    const n = this.name || source;
    this.next.handle(msg, n, topic);

};

NOOP_STREAM.addStubs(PassStream);

export default PassStream;



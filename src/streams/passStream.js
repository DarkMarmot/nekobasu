
import NOOP_STREAM from './noopStream.js';

function IDENTITY(msg, source) { return msg; }


function PassStream(name) {

    this.name = name || '';
    this.next = NOOP_STREAM;

}

PassStream.prototype.handle = function passHandle(msg, source) {

    const n = this.name || source;
    this.next.handle(msg, n);

};

NOOP_STREAM.addStubs(PassStream);

export default PassStream;



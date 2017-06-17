
import NOOP_STREAM from './noopStream.js';

function IDENTITY(msg, source, topic) { return msg; }


function PassStream(name) {

    this.name = name;
    this.next = NOOP_STREAM;

}

PassStream.prototype.handle = function handle(msg, source, topic) {

    const name = this.name;
    const n = name || source;
    this.next.handle(msg, n, topic);

};

NOOP_STREAM.addStubs(PassStream);

export default PassStream;




import NOOP_STREAM from './noopStream.js';

function IDENTITY(d) { return d; }


function TapStream() {
    this.f = IDENTITY;
    this.next = NOOP_STREAM;
}

TapStream.prototype.handle = function handle(msg, source, topic) {

    const f = this.f;
    f(msg, source, topic);
    this.next.handle(msg, source, topic);

};

export default TapStream;



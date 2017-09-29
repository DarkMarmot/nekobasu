
import NOOP_STREAM from './noopStream.js';

function IDENTITY(d) { return d; }


function TapStream(name, f) {
    this.name = name;
    this.f = f || IDENTITY;
    this.next = NOOP_STREAM;
}

TapStream.prototype.handle = function handle(msg, source) {

    const n = this.name || source;
    const f = this.f;
    f(msg, n);
    this.next.handle(msg, n);

};

NOOP_STREAM.addStubs(TapStream);


export default TapStream;



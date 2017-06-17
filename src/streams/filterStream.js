
import NOOP_STREAM from './noopStream.js';

function IDENTITY(d) { return d; }


function FilterStream(name, f) {

    this.name = name;
    this.f = f || IDENTITY;
    this.next = NOOP_STREAM;

}

FilterStream.prototype.handle = function handle(msg, source, topic) {

    const f = this.f;
    const v = !!f(msg, source, topic);
    const n = source;
    const next = this.next;

    v && next.handle(msg, n, topic);

};

NOOP_STREAM.addStubs(FilterStream);

export default FilterStream;



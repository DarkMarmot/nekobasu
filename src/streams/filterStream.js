
import NOOP_STREAM from './noopStream.js';

function IDENTITY(d) { return d; }


function FilterStream(name, f, context) {

    this.name = name;
    this.f = f || IDENTITY;
    this.context = context || null;
    this.next = NOOP_STREAM;

}

FilterStream.prototype.handle = function handle(msg, source, topic) {

    const f = this.f;
    f.call(this.context, msg, source, topic) && this.next.handle(msg, source, topic);

};

NOOP_STREAM.addStubs(FilterStream);

export default FilterStream;



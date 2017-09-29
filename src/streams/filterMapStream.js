
import NOOP_STREAM from './noopStream.js';

function IDENTITY(d) { return d; }


function FilterMapStream(name, f, m, context) {

    this.name = name || '';
    this.f = f || IDENTITY;
    this.m = m || IDENTITY;
    this.context = context || null;
    this.next = NOOP_STREAM;

}

FilterMapStream.prototype.handle = function filterHandle(msg, source) {

    const f = this.f;
    const m = this.m;
    f.call(this.context, msg, source) && this.next.handle(
        m.call(this.context, msg, source));

};

NOOP_STREAM.addStubs(FilterMapStream);

export default FilterMapStream;



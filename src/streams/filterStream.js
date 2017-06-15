
import NOOP_STREAM from './noopStream.js';

function IDENTITY(d) { return d; }


function FilterStream(name) {

    this.name = name;
    this.f = IDENTITY;
    this.next = NOOP_STREAM;

}

FilterStream.prototype.handle = function handle(msg, source, topic) {

    const f = this.f;
    const v = f(msg, source, topic);
    const n = this.name;

    v && this.next.handle(msg, n, topic);

};


export default FilterStream;



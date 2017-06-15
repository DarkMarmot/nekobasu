
import NOOP_STREAM from './noopStream.js';
const ALWAYS = function(){ return true; };

function WhenStream(name, pool) {

    this.name = name;
    this.next = NOOP_STREAM;
    this.pool = pool;
    this.f = ALWAYS;
    this.isPrimed = false;

}

WhenStream.prototype.handle = function handle(msg, source, topic) {

    const n = this.name;
    this.pool.handle(msg, n, topic);

};

NOOP_STREAM.addStubs(PoolStream);

export default PoolStream;




import NOOP_STREAM from './noopStream.js';
import NOOP_POOL from '../pools/noopPool.js';


function TimerStream(name) {

    this.name = name;
    this.next = NOOP_STREAM;
    this.pool = NOOP_POOL;
    this.isPrimed = false;

}

TimerStream.prototype.handle = function handle(msg, source, topic) {

    const n = this.name;
    this.pool.handle(msg, n, topic);

};

NOOP_STREAM.addStubs(PoolStream);

export default PoolStream;




import NOOP_POOL from './noopPool.js';


function LastPool(stream) {

    this.stream = stream;
    this.hasValue = false;
    this.msg = undefined;
    this.topic = null;

}

LastPool.prototype.handle = function(msg, source, topic){

    this.hasValue = true;
    this.msg = msg;
    this.topic = topic;
    this.stream.next.handle(msg, source, topic);

};

NOOP_POOL.addStubs(LastPool);


export default LastPool;



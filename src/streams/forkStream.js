
import NOOP_STREAM from './noopStream.js';


function ForkStream(name) {

    this.name = name;
    this.next = NOOP_STREAM;
    this.fork = NOOP_STREAM;

}

ForkStream.prototype.handle = function handle(msg, source, topic) {

    const n = this.name;
    this.next.handle(msg, n, topic);
    this.fork.handle(msg, n, topic);

};

export default ForkStream;



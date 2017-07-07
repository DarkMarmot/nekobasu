
import NOOP_STREAM from './noopStream.js';


function ForkStream(name, fork) {

    this.name = name;
    this.next = NOOP_STREAM;
    this.fork = fork;

}

ForkStream.prototype.handle = function handle(msg, source, topic) {

    const n = this.name;
    this.next.handle(msg, n, topic);
    this.fork.handle(msg, n, topic);

};

NOOP_STREAM.addStubs(ForkStream);

export default ForkStream;



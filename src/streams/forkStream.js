
import NOOP_STREAM from './noopStream.js';


function ForkStream(name, fork) {

    this.name = name;
    this.next = NOOP_STREAM;
    this.fork = fork;

}

ForkStream.prototype.handle = function handle(msg, source) {

    const n = this.name;
    this.next.handle(msg, n);
    this.fork.handle(msg, n);

};

ForkStream.prototype.reset = function reset(msg){

    this.next.reset(msg);
    this.fork.reset(msg);
};

NOOP_STREAM.addStubs(ForkStream);

export default ForkStream;



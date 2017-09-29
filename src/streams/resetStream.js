
import NOOP_STREAM from './noopStream.js';


function ResetStream(name, head) {

    this.head = head; // stream at the head of the reset process
    this.name = name;
    this.next = NOOP_STREAM;

}

ResetStream.prototype.handle = function handle(msg, source) {

    this.next.handle(msg, source);
    this.head.reset(msg, source);

};

ResetStream.prototype.reset = function(){
    // catch reset from head, does not continue
};

export default ResetStream;



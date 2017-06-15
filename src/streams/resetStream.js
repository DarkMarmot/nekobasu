
import NOOP_STREAM from './noopStream.js';


function ResetStream(name, head) {

    this.head = head; // stream at the head of the reset process
    this.name = name;
    this.next = NOOP_STREAM;

}

ResetStream.prototype.handle = function handle(msg, source, topic) {

    this.next.handle(msg, source, topic);
    this.head.reset();

};

export default ResetStream;



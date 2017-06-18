
import NOOP_STREAM from './noopStream.js';


function ScanStream(name, f) {

    this.name = name;
    this.f = f;
    this.hasValue = false;
    this.next = NOOP_STREAM;
    this.value = undefined;

}


ScanStream.prototype.handle = function handle(msg, source, topic) {

    this.value = this.hasValue ? this.f(this.value, msg, source, topic) : msg;
    this.next.handle(this.value, source, topic);

};

ScanStream.prototype.reset = function reset(msg) {

    this.hasValue = false;
    this.value = undefined;
    this.next.reset();

};

NOOP_STREAM.addStubs(ScanStream);


export default ScanStream;



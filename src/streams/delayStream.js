
import NOOP_STREAM from './noopStream.js';

function IMMEDIATE(msg, source, topic) { return 0; }

function callback(stream, msg, source, topic){
    stream.next.handle(msg, source, topic);
}

function DelayStream(name, f) {

    this.name = name;
    this.f = f || IMMEDIATE;
    this.next = NOOP_STREAM;

}

DelayStream.prototype.handle = function handle(msg, source, topic) {

    const delay = this.f(msg, source, topic);
    setTimeout(callback, delay, msg, source, topic);

};

export default DelayStream;




import NOOP_STREAM from './noopStream.js';


function WriteStream(name, data, topic) {
    this.name = name;
    this.data = data;
    this.topic = topic;
    this.next = NOOP_STREAM;
}

WriteStream.prototype.handle = function handle(msg, source, topic) {

    this.data.write(msg, topic);
    this.next.handle(msg, source, topic);

};

NOOP_STREAM.addStubs(WriteStream);


export default WriteStream;



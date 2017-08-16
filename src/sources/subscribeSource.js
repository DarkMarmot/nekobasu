
import NOOP_SOURCE from './noopSource.js';
import PassStream from '../streams/passStream.js';


function SubscribeSource(name, data, topic, canPull){

    this.name = name;
    this.data = data;
    this.topic = topic;
    this.canPull = canPull;
    const stream = this.stream = new PassStream(name);
    this.callback = function(msg, source, topic){ stream.handle(msg, source, topic) };
    data.subscribe(this.callback, topic);

};


SubscribeSource.prototype.pull = function pull(){

    !this.dead && this.canPull && this.emit();

};


SubscribeSource.prototype.emit = function emit(){

    const data = this.data;
    const topic = this.topic;

    const present = data.present(topic);

    if(present) {
        const stream = this.stream;
        const msg = data.read(topic);
        const source = this.name;
        stream.handle(msg, source, topic);
    }

};


SubscribeSource.prototype.destroy = function destroy(){

    const callback = this.callback;
    const topic = this.topic;

    this.data.unsubscribe(callback, topic);
    this.dead = true;

};


NOOP_SOURCE.addStubs(SubscribeSource);

export default SubscribeSource;


import Packet from './packet.js';
import { DATA_TYPES } from './dataTypes';

class SubscriberList {

    constructor(topic, data) {

        this._topic = topic;
        this._subscribers = [];
        this._lastPacket = null;
        this._data = data;
        this._name = data._name;
        this._dead = false;

    };

    get lastPacket() { return this._lastPacket; };
    get data() { return this._data; };
    get name() { return this._name; };
    get dead() { return this._dead; };
    get topic() { return this._topic; };

    handle(msg, topic, silently){

        if(this.dead)
            return;

        topic = topic || this.topic;
        let source = this.name;
        let currentPacket = new Packet(msg, topic, source);

        if(this.data.type !== DATA_TYPES.ACTION) // actions do not store data (ephemeral and immediate)
            this._lastPacket = currentPacket;

        let subscribers = [].concat(this._subscribers); // call original sensors in case subscriptions change mid loop
        let len = subscribers.length;

        if(!silently) {
            for (let i = 0; i < len; i++) {
                let s = subscribers[i];
                typeof s === 'function' ? s.call(s, msg, currentPacket) : s.handle(msg, currentPacket);
            }
        }

    };

    destroy(){

        if(this.dead)
            return;

        this._subscribers = null;
        this._lastPacket = null;
        this._dead = true;

    };

    add(watcher){

        this._subscribers.push(watcher);

    };

    remove(watcher){

        let i = this._subscribers.indexOf(watcher);

        if(i !== -1)
            this._subscribers.splice(i, 1);

    };

}


export default SubscriberList;


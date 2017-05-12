
import SubscriberList from './subscriberList.js';
import {isValid, DATA_TYPES} from './dataTypes.js';

const NO_TOPIC = '___NO_TOPIC___';

class Data {

    constructor(scope, name, type) {

        type = type || DATA_TYPES.NONE;

        if(!isValid(type))
            throw new Error('Invalid Data of type: ' + type);

        this._scope      = scope;
        this._name       = name;
        this._type       = type;
        this._dead       = false;

        this._wildcardSubscriberList = new SubscriberList(null, this);
        this._subscriberListsByTopic = new Map();

    };

    get scope() { return this._scope; };
    get name() { return this._name; };
    get type() { return this._type; };
    get dead() { return this._dead; };

    destroy(){

        if(this.dead)
            this._throwDead();
        
        for(const list of this._subscriberListsByTopic.values()){
            list.destroy();
        }

        this._dead = true;

    };
    
    _demandSubscriberList(topic){

        topic = topic || undefined;
        let list = this._subscriberListsByTopic.get(topic);

        if(list)
            return list;

        list = new SubscriberList(topic, this);
        this._subscriberListsByTopic.set(topic, list);

        return list;
        
    };

    verify(expectedType){

        if(this.type === expectedType)
            return this;

        throw new Error('Data ' + this.name + ' requested as type ' + expectedType + ' exists as ' + this.type);

    };

    follow(watcher, topic){

        if(this.dead)
            this._throwDead();

        topic = topic || undefined;
        this.subscribe(watcher, topic);
        let packet = this.peek();

        if(packet)
            typeof watcher === 'function' ? watcher.call(watcher, packet.msg, packet) : watcher.handle(packet.msg, packet);

        return this;

    };

    subscribe(watcher, topic){

        if(this.dead)
            this._throwDead();

        topic = topic || undefined;
        this._demandSubscriberList(topic).add(watcher);

        return this;

    };

    monitor(watcher){

        if(this.dead)
            this._throwDead();

        this._wildcardSubscriberList.add(watcher);

        return this;

    };

    unsubscribe(watcher, topic){

        if(this.dead)
            this._throwDead();

        topic = topic || undefined;
        this._demandSubscriberList(topic).remove(watcher);
        this._wildcardSubscriberList.remove(watcher);

        return this;

    };

    topics(){

        return this._subscriberListsByTopic.keys();

    };

    survey(){ // get entire key/value store by topic:lastPacket

        const entries = this._subscriberListsByTopic.entries();
        const m = new Map();
        for (const [key, value] of entries) {
            m.set(key, value.lastPacket);
        }

        return m;
    };


    peek(topic){

        if(this.dead)
            this._throwDead();

        topic = topic || undefined;
        const subscriberList = this._subscriberListsByTopic.get(topic);
        return subscriberList ? subscriberList.lastPacket : null;

    };


    read(topic) {

        if(this.dead)
            this._throwDead();

        topic = topic || undefined;
        let packet = this.peek(topic);
        return (packet) ? packet.msg : undefined;

    };


    silentWrite(msg, topic){

        if(this.dead)
            this._throwDead();

        topic = topic || undefined;
        this.write(msg, topic, true);

    };


    write(msg, topic, silently){

        if(this.dead)
            this._throwDead();

        if(this.type === DATA_TYPES.MIRROR)
            throw new Error('Mirror Data: ' + this.name + ' is read-only');

        topic = topic || undefined;
        const list = this._demandSubscriberList(topic);
        list.handle(msg, topic, silently);
        this._wildcardSubscriberList.handle(msg, topic, silently);

    };


    refresh(topic){

        if(this.dead)
            this._throwDead();

        topic = topic || undefined;
        const lastPacket = this.peek(topic);

        if(lastPacket)
            this.write(lastPacket._msg, topic);

        return this;

    };


    toggle(topic){

        if(this.dead)
            this._throwDead();

        topic = topic || undefined;
        this.write(!this.read(topic), topic);

        return this;

    };

    _throwDead(){

        throw new Error('Data: ' + this.name + ' is already dead.');

    };

}

export default Data;













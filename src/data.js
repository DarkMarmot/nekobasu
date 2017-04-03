
import SubscriberList from './subscriberList.js';
import {isValid, DATA_TYPES} from './dataTypes.js';


class Data {

    constructor(scope, name, type) {

        type = type || DATA_TYPES.NONE;

        if(!isValid(type))
            throw new Error('Invalid Data of type: ' + type);

        this._scope      = scope;
        this._name       = name;
        this._type       = type;
        this._dead       = false;

        this._noTopicSubscriberList = new SubscriberList(null, this);
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

        this.subscribe(watcher, topic);
        let packet = this.peek();

        if(packet)
            typeof watcher === 'function' ? watcher.call(watcher, packet.msg, packet) : watcher.tell(packet.msg, packet);

        return this;

    };

    subscribe(watcher, topic){

        if(this.dead)
            this._throwDead();

        const subscriberList = (!topic) ? this._noTopicSubscriberList : this._demandSubscriberList(topic);
        subscriberList.add(watcher);

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

        if(typeof topic !== 'string'){
            this._noTopicSubscriberList.remove(watcher);
        } else {
            let subscriberList = this._demandSubscriberList(topic);
            subscriberList.remove(watcher);
        }
        this._wildcardSubscriberList.remove(watcher);

        return this;

    };



    peek(topic){

        if(this.dead)
            this._throwDead();

        let subscriberList = topic ? this._subscriberListsByTopic.get(topic) : this._noTopicSubscriberList;
        if(!subscriberList)
            return null;
        return subscriberList.lastPacket;

    };


    read(topic) {

        if(this.dead)
            this._throwDead();

        let packet = this.peek(topic);
        return (packet) ? packet.msg : undefined;

    };


    silentWrite(msg, topic){

        if(this.dead)
            this._throwDead();

        this.write(msg, topic, true);

    };


    write(msg, topic, silently){

        if(this.dead)
            this._throwDead();

        if(this.type === DATA_TYPES.MIRROR)
            throw new Error('Mirror Data: ' + this.name + ' is read-only');

        if(topic) {
            let list = this._demandSubscriberList(topic);
            list.tell(msg);
        }
        else {
            this._noTopicSubscriberList.tell(msg, null, silently);
        }

        this._wildcardSubscriberList.tell(msg, topic, silently);

    };


    refresh(topic){

        if(this.dead)
            this._throwDead();

        this.write(this.read(topic), topic);

        return this;

    };


    toggle(topic){

        if(this.dead)
            this._throwDead();

        this.write(!this.read(topic), topic);

        return this;

    };

    _throwDead(){

        throw new Error('Data: ' + this.name + ' is already dead.');

    };

}

export default Data;













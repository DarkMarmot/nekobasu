
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

        this._noTopicList = new SubscriberList(null, this);
        this._wildcardSubscriberList = new SubscriberList(null, this);
        this._subscriberListsByTopic = {};

    };

    get scope() { return this._scope; };
    get name() { return this._name; };
    get type() { return this._type; };
    get dead() { return this._dead; };

    destroy(){

        // if(this.dead)
        //     this._throwDead();
        
        for(const list of this._subscriberListsByTopic.values()){
            list.destroy();
        }

        this._dead = true;

    };
    
    _demandSubscriberList(topic){

        topic = topic || null;
        let list = topic ? this._subscriberListsByTopic[topic] : this._noTopicList;

        if(list)
            return list;

        list = new SubscriberList(topic, this);
        this._subscriberListsByTopic[topic] = list;

        return list;
        
    };

    verify(expectedType){

        if(this.type === expectedType)
            return this;

        throw new Error('Data ' + this.name + ' requested as type ' + expectedType + ' exists as ' + this.type);

    };

    follow(watcher, topic){

        // if(this.dead)
        //     this._throwDead();

        const list = this.subscribe(watcher, topic);

        if(list.used)
            typeof watcher === 'function' ? watcher.call(watcher, list.lastMsg, list.source, list.lastTopic) : watcher.handle(list.lastMsg, list.source, list.lastTopic);

        return this;

    };

    subscribe(watcher, topic){

        // if(this.dead)
        //     this._throwDead();

        return this._demandSubscriberList(topic).add(watcher);

    };

    monitor(watcher){

        // if(this.dead)
        //     this._throwDead();

        this._wildcardSubscriberList.add(watcher);

        return this;

    };

    unsubscribe(watcher, topic){

        // if(this.dead)
        //     this._throwDead();

        topic = topic || null;
        this._demandSubscriberList(topic).remove(watcher);
        this._wildcardSubscriberList.remove(watcher);

        return this;

    };

    // topics(){
    //
    //     return this._subscriberListsByTopic.keys();
    //
    // };

    survey(){
        // get entire key/value store by topic:lastPacket
        throw new Error('not imp');

        // const entries = this._subscriberListsByTopic.entries();
        // const m = new Map();
        // for (const [key, value] of entries) {
        //     m.set(key, value.lastPacket);
        // }
        //
        // return m;
    };


    present(topic){

        // if(this.dead)
        //     this._throwDead();

        const subscriberList = this._demandSubscriberList(topic);
        return subscriberList.used;

    };


    read(topic) {

        // if(this.dead)
        //     this._throwDead();

        const list = this._demandSubscriberList(topic);
        return (list.used) ? list.lastMsg : undefined;

    };


    silentWrite(msg, topic){

        // if(this.dead)
        //     this._throwDead();

        this.write(msg, topic, true);

    };


    write(msg, topic, silently){

        // todo change methods to imply if statements for perf?

        // if(this.dead)
        //     this._throwDead();

        if(this.type === DATA_TYPES.MIRROR)
            throw new Error('Mirror Data: ' + this.name + ' is read-only');

        const list = this._demandSubscriberList(topic);
        list.handle(msg, topic, silently);
        this._wildcardSubscriberList.handle(msg, topic, silently);

    };


    refresh(topic){

        // if(this.dead)
        //     this._throwDead();

        const list = this._demandSubscriberList(topic);

        if(list.used)
            this.write(list.lastMsg, list.lastTopic);

        return this;

    };


    toggle(topic){

        // if(this.dead)
        //     this._throwDead();

        this.write(!this.read(topic), topic);

        return this;

    };

    _throwDead(){

        throw new Error('Data: ' + this.name + ' is already dead.');

    };

}

export default Data;















import { DATA_TYPES } from './dataTypes';

function callMany(list, msg, source, topic){

    const len = list.length;
    for (let i = 0; i < len; i++) {
        let s = list[i];
        s.call(s, msg, source, topic);
    }

}

function callNoOne(list, msg, source, topic){}

function callOne(list, msg, source, topic){
        const s = list[0];
        s.call(s, msg, source, topic);
}

class SubscriberList {

    constructor(topic, data) {

        this._topic = topic;
        this._subscribers = [];
        this._callback = callNoOne;
        this._used = false; // true after first msg
        this._lastMsg = null;
        this._lastTopic = null;
        this._data = data;
        this._name = data._name;
        this._dead = false;

        if(data.type === DATA_TYPES.ACTION) {
            this.handle = this.handleAction;
        }
    };

    get used() { return this._used; };
    get lastMsg() { return this._lastMsg; };
    get lastTopic() { return this._lastTopic; };
    get data() { return this._data; };
    get name() { return this._name; };
    get dead() { return this._dead; };
    get topic() { return this._topic; };

    handle(msg, topic, silently){

        // if(this.dead)
        //     return;

        this._used = true;
        topic = topic || this.topic;
        let source = this.name;

        this._lastMsg = msg;
        this._lastTopic = topic;

        //let subscribers = [].concat(this._subscribers); // call original sensors in case subscriptions change mid loop

        if(!silently) {
            this._callback(this._subscribers, msg, source, topic);
        }

    };

    handleAction(msg, topic){

        topic = topic || this.topic;
        let source = this.name;

        //let subscribers = [].concat(this._subscribers); // call original sensors in case subscriptions change mid loop
        this._callback(this._subscribers, msg, source, topic);

    };


    destroy(){

        // if(this.dead)
        //     return;

        this._subscribers = null;
        this._lastMsg = null;
        this._dead = true;

    };

    add(watcher){

        const s = typeof watcher === 'function' ? watcher : function(msg, source, topic){ watcher.handle(msg, source, topic);};
        this._subscribers.push(s);
        this.determineCaller();
        return this;

    };

    remove(watcher){

        let i = this._subscribers.indexOf(watcher);

        if(i !== -1)
            this._subscribers.splice(i, 1);

        this.determineCaller();

        return this;
    };

    determineCaller(){
        const len = this._subscribers.length;
        if(len === 0){
            this._callback = callNoOne;
        } else if (len === 1){
            this._callback = callOne;
        } else {
            this._callback = callMany;
        }

    }

}


export default SubscriberList;


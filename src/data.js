
import {isPrivate, isAction} from './dataTypes.js';


class Data {

    // should only be created via Scope methods

    constructor(scope, name, type) {

        this._scope       = scope;
        this._action      = isAction(name);
        this._name        = name;
        this._type        = type;
        this._dead        = false;
        this._value       = undefined;
        this._present     = false;  // true if a value has been received
        this._private     = isPrivate(name);
        this._readable    = !this._action;
        this._writable    = true; // false when mirrored
        this._subscribers = [];

    };

    get scope() { return this._scope; };
    get name() { return this._name; };
    get type() { return this._type; };
    get dead() { return this._dead; };
    get present() { return this._present; };
    get private() { return this._private; };


    destroy(){

        this._scope = null;
        this._subscribers = null;
        this._dead = true;

    };

    subscribe(watcher, pull){

        this._subscribers.unshift(watcher);

        if(pull && this._present)
            watcher.call(null, this._value, this._name);

        return this;

    };

    unsubscribe(watcher){


        let i = this._subscribers.indexOf(watcher);

        if(i !== -1)
            this._subscribers.splice(i, 1);

        return this;

    };


    silentWrite(msg){

        this.write(msg, true);

    };

    read(){

        _ASSERT_READ_ACCESS(this);
        return this._value;

    };

    write(msg, silent){

        _ASSERT_WRITE_ACCESS(this);

        this._present = true;
        let i = this._subscribers.length;
        this._value = msg;

        if(!silent) {
            while (i--) {
                this._subscribers[i].call(null, msg, this._name);
            }
        }

    };

    refresh(){

        if(this._present)
            this.write(this._value);

        return this;

    };

    toggle(){

        this.write(!this._value);

        return this;

    };

}


function _ASSERT_WRITE_ACCESS(d){
    if(!d._writable)
        throw new Error('States accessed from below are read-only. Named: ' + d._name);
}

function _ASSERT_READ_ACCESS(d){
    if(!d._readable)
        throw new Error('Actions are read-only. Named: ' + d._name);
}

export default Data;


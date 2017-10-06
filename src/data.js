
import {isPrivate, isAction} from './dataTypes.js';


class Data {

    // should only be created via Scope methods

    constructor(scope, name) {

        this._scope       = scope;
        this._action      = isAction(name);
        this._name        = name;
        this._dead        = false;
        this._value       = undefined;
        this._present     = false;  // true if a value has been received
        this._private     = isPrivate(name);
        this._readable    = !this._action;
        this._writable    = true; // false when mirrored or calculated?
        this._subscribers = [];

    };

    get scope() { return this._scope; };
    get name() { return this._name; };
    get dead() { return this._dead; };
    get present() { return this._present; };
    get private() { return this._private; };

    destroy(){

        this._scope = null;
        this._subscribers = null;
        this._dead = true;

    };

    subscribe(listener, pull){

        this._subscribers.unshift(listener);

        if(pull && this._present)
            listener.call(null, this._value, this._name);

        return this;

    };

    unsubscribe(listener){


        let i = this._subscribers.indexOf(listener);

        if(i !== -1)
            this._subscribers.splice(i, 1);

        return this;

    };

    silentWrite(msg){

        this.write(msg, true);

    };

    read(){

        return this._value;

    };

    write(msg, silent){

        _ASSERT_WRITE_ACCESS(this);

        if(!this._action) { // states store the last value seen
            this._present = true;
            this._value = msg;
        }

        if(!silent) {
            let i = this._subscribers.length;
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

export default Data;


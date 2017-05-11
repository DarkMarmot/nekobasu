
import F from './flib.js';
import Data from './data.js';
import { DATA_TYPES, isValid } from './dataTypes.js';
import Bus from './bus.js';
import Nyan from './nyan.js';
import Stream from './stream.js';
import nyanToBus from './nyanBus.js';

let idCounter = 0;

function _destroyEach(arr){

    const len = arr.length;
    for(let i = 0; i < len; i++){
        const item = arr[i];
        item.destroy();
    }

}


class Scope{

    constructor(name) {

        this._id = ++idCounter;
        this._name = name;
        this._parent = null;
        this._children = [];
        this._busList = [];
        this._dataList = new Map();
        this._valves = new Map();
        this._mirrors = new Map();
        this._dead = false;

    };

    get name() { return this._name; };
    get dead() { return this._dead; };

    get children(){

        return this._children.map((d) => d);

    };


    react(str, context, node){ // string is Nyan

        if(!str)
            throw new Error('Need a Nyan phrase!');

        let b = new Bus(this);

        return nyanToBus(this, b, str, context, node);

    };

    clear(){

        if(this._dead)
            return;

        _destroyEach(this.children); // iterates over copy to avoid losing position as children leaves their parent
        _destroyEach(this._busList);
        _destroyEach(this._dataList.values());

        this._children = [];
        this._busList = [];
        this._dataList.clear();
        this._valves.clear();
        this._mirrors.clear();

    };

    destroy(){

        this.clear();
        this.parent = null;
        this._dead = true;

    };

    createChild(name){

        let child = new Scope(name);
        child.parent = this;
        return child;

    };

    insertParent(newParent){

        newParent.parent = this.parent;
        this.parent = newParent;
        return this;

    };

    get parent() { return this._parent; };

    set parent(newParent){

        const oldParent = this.parent;

        if(oldParent === newParent)
            return;

        if(oldParent) {
            const i = oldParent._children.indexOf(this);
            oldParent._children.splice(i, 1);
        }

        this._parent = newParent;

        if(newParent) {
            newParent._children.push(this);
        }

        return this;

    };

    set valves(list){

        for(const name of list){
            this._valves.set(name, true);
        }

    }

    get valves(){ return Array.from(this._valves.keys());};


    _createMirror(data){

        const mirror = Object.create(data);
        mirror._type = DATA_TYPES.MIRROR;
        this._mirrors.set(data.name, mirror);
        return mirror;

    };

    _createData(name, type){

        const d = new Data(this, name, type);
        this._dataList.set(name, d);
        return d;

    };


    data(name){

        return this.grab(name) || this._createData(name, DATA_TYPES.NONE);

    };


    action(name){

        const d = this.grab(name);

        if(d)
            return d.verify(DATA_TYPES.ACTION);

        return this._createData(name, DATA_TYPES.ACTION);

    };


    state(name){

        const d = this.grab(name);

        if(d)
            return d.verify(DATA_TYPES.STATE);

        const state = this._createData(name, DATA_TYPES.STATE);
        this._createMirror(state);
        return state;

    };


    findDataSet(names, required){


        const result = {};
        for(const name of names){
            result[name] = this.find(name, required);
        }

        return result;

    };

    readDataSet(names, required){

        const dataSet = this.findDataSet(names, required);
        const result = {};

        for(const d of dataSet) {
            if (d) {
                const lastPacket = d.peek();
                if (lastPacket)
                    result[d.name] = lastPacket.msg;
            }
        }

        return result;
    };


    // created a flattened view of all data at and above this scope

    flatten(){

        let scope = this;

        const result = new Map();
        const appliedValves = new Map();

        for(const [key, value] of scope._dataList){
            result.set(key, value);
        }

        while(scope = scope._parent){

            const dataList = scope._dataList;
            const valves = scope._valves;
            const mirrors = scope._mirrors;

            if(!dataList.size)
                continue;

            // further restrict valves with each new scope

            if(valves.size){
                if(appliedValves.size) {
                    for (const key of appliedValves.keys()) {
                        if(!valves.has(key))
                            appliedValves.delete(key);
                    }
                } else {
                    for (const [key, value] of valves.entries()) {
                        appliedValves.set(key, value);
                    }
                }
            }

            const possibles = appliedValves.size ? appliedValves : dataList;

            for(const key of possibles.keys()) {
                if (!result.has(key)) {

                    const data = mirrors.get(key) || dataList.get(key);
                    if (data)
                        result.set(key, data);
                }
            }

        }

        return result;

    };


    find(name, required){

        const localData = this.grab(name);
        if(localData)
            return localData;

        let scope = this;

        while(scope = scope._parent){

            const valves = scope._valves;

            // if valves exist and the name is not present, stop looking
            if(valves.size && !valves.has(name)){
                break;
            }

            const mirror = scope._mirrors.get(name);

            if(mirror)
                return mirror;

            const d = scope.grab(name);

            if(d)
                return d;

        }

        if(required)
            throw new Error('Required data: ' + name + ' not found!');

        return null;

    };

    findOuter(name, required){

        let foundInner = false;
        const localData = this.grab(name);
        if(localData)
            foundInner = true;

        let scope = this;

        while(scope = scope._parent){

            const valves = scope._valves;

            // if valves exist and the name is not present, stop looking
            if(valves.size && !valves.has(name)){
                break;
            }

            const mirror = scope._mirrors.get(name);

            if(mirror) {

                if(foundInner)
                    return mirror;

                foundInner = true;
                continue;
            }

            const d = scope.grab(name);

            if(d) {

                if(foundInner)
                    return d;

                foundInner = true;
            }

        }

        if(required)
            throw new Error('Required data: ' + name + ' not found!');

        return null;

    };

    grab(name, required) {

        const data = this._dataList.get(name);

        if(!data && required)
            throw new Error('Required Data: ' + name + ' not found!');

        return data || null;

    };

    transaction(writes){

        if(Array.isArray(writes))
            return this._multiWriteArray(writes);
        else if(typeof writes === 'object')
            return this._multiWriteHash(writes);

        throw new Error('Write values must be in an array of object hash.');

    };

    // write {name, topic, value} objects as a transaction
    _multiWriteArray(writeArray, dimension){

        const list = [];

        for(const w of writeArray){
            const d = this.find(w.name);
            d.silentWrite(w.value, w.topic);
            list.push(d);
        }

        let i = 0;
        for(const d of list){
            const w = writeArray[i];
            d.refresh(w.topic);
        }

        return this;

    };


    // write key-values as a transaction
    _multiWriteHash(writeHash){

        const list = [];

        for(const k in writeHash){
            const v = writeHash[k];
            const d = this.find(k);
            d.silentWrite(v);
            list.push(d);
        }

        for(const d of list){
            d.refresh();
        }

        return this;

    };

}

export default Scope;

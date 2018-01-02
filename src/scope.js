

import Data from './data.js';
import { isPrivate, isAction } from './dataTypes.js';
import Bus from './bus.js';

let idCounter = 0;

function _destroyEach(arr){

    let i = arr.length;
    while(i--){
        arr[i].destroy();
    }

}

class Scope{

    constructor(name) {

        this._id = ++idCounter;
        this._name = name;
        this._parent = null;
        this._children = [];
        this._wires = {};
        this._buses = [];
        this._dataMap = new Map();
        this._valveMap = new Map();
        this._mirrorMap = new Map();
        this._dead = false;
        this._shared = false; // shared scopes can access private actions and states in their parent

    };

    get name() { return this._name; };
    get dead() { return this._dead; };

    get children(){

        return this._children.map((d) => d);

    };

    bus(){

        return new Bus(this);

    };


    clear(){

        if(this._dead)
            return;

        _destroyEach(this.children);
        _destroyEach(this._buses);
        _destroyEach(this._dataMap.values());

        this._children = [];
        this._buses = [];
        this._dataMap.clear();
        this._valveMap.clear();
        this._mirrorMap.clear();

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
            this._valveMap.set(name, true);
        }

    }

    get valves(){ return Array.from(this._valveMap.keys());};


    _createMirror(data){

        const mirror = Object.create(data);
        mirror._writable = false;
        this._mirrorMap.set(data.name, mirror);
        return mirror;

    };

    _createData(name){

        const d = new Data(this, name);
        this._dataMap.set(name, d);
        if(!d._action && !d._private) // if a public state, create a read-only mirror
            this._createMirror(d);
        return d;

    };

    demand(name){

        return this.grab(name) || this._createData(name);

    };


    wire(stateName){

        const actionName = stateName + '$';
        const state = this.demand(stateName);
        const action = this.demand(actionName);

        if(!this._wires[stateName]) {
            this._wires[stateName] = this.bus().meow(actionName + ' > ' + stateName);
        }

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

                if (d.present)
                    result[d.name] = d.read();
            }
        }

        return result;
    };


    // created a flattened view of all data at and above this scope

    flatten(){

        let scope = this;

        const result = new Map();
        const appliedValves = new Map();

        for(const [key, value] of scope._dataMap){
            result.set(key, value);
        }

        while(scope = scope._parent){

            const dataList = scope._dataMap;
            const valves = scope._valveMap;
            const mirrors = scope._mirrorMap;

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

        // if(this.shared){
        //     const sharedData = this._parent.grab(name);
        //     if(sharedData)
        //         return sharedData;
        // }

        let scope = this;

        while(scope = scope._parent){

            const valves = scope._valveMap;

            // if valves exist and the name is not present, stop looking
            if(valves.size && !valves.has(name)){
                break;
            }

            const mirror = scope._mirrorMap.get(name);

            if(mirror)
                return mirror;

            const d = scope.grab(name);

            if(d) {
                if (d._private)
                    continue;
                return d;
            }

        }

        _ASSERT_NOT_REQUIRED(required);

        return null;

    };


    findOuter(name, required){

        _ASSERT_NO_OUTER_PRIVATE(name);

        let foundInner = false;
        const localData = this.grab(name);

        if(localData)
            foundInner = true;

        let scope = this;

        while(scope = scope._parent){

            const valves = scope._valveMap;

            // if valves exist and the name is not present, stop looking
            if(valves.size && !valves.has(name)){
                break;
            }

            const mirror = scope._mirrorMap.get(name);

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

        const data = this._dataMap.get(name);

        if(!data && required)
            throw new Error('Required Data: ' + name + ' not found!');

        return data || null;

    };


    // write key-values as a transaction
    write(writeHash){

        const list = [];

        for(const k in writeHash){
            const v = writeHash[k];
            const d = this.find(k);
            // todo ASSERT_DATA_FOUND
            d.silentWrite(v);
            list.push(d);
        }

        for(const d of list){
            d.refresh();
        }

        return this;

    };

}

function _ASSERT_NOT_REQUIRED(required){
    if(required)
        throw new Error('Required data: ' + name + ' not found!');
}

function _ASSERT_NO_OUTER_PRIVATE(name){
    if(isPrivate(name))
        throw new Error('Private data: ' + name + ' cannot be accessed via an outer scope!');
}

export default Scope;

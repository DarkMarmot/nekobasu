import Wire from './wire.js';
import Nyan from './nyan.js';
import Bus from './bus.js';

function getPacketFromDataWord(scope, word){

    const data = scope.find(word.name, !word.maybe);
    const peek = data && data.peek(word.topic);
    return peek;

}


function getSurveyFromDataWord(scope, word){

    const data = scope.find(word.name, !word.maybe);
    return data && data.survey();

}

function throwError(msg){
    console.log('throwing ', msg);
    const e = new Error(msg);
    console.log(this, e);
    throw e;
}

function getDoSkipNamedDupes(names){

    let lastMsg = {};
    const len = names.length;

    return function doSkipNamedDupes(msg) {

        let diff = false;
        for(let i = 0; i < len; i++){
            const name = names[i];
            if(!lastMsg.hasOwnProperty(name) || lastMsg[name] !== msg[name])
                diff = true;
            lastMsg[name] = msg[name];
        }

        return diff;

    };
}


function getDoWrite(scope, word){

    const data = scope.find(word.name, !word.maybe);

    return function doWrite(msg) {
        data.write(msg, word.topic);
    };

}


function getDoSpray(scope, phrase){

    const wordByAlias = {};
    const dataByAlias = {};

    const len = phrase.length;

    for(let i = 0; i < len; i++){ // todo, validate no dupe alias in word validator for spray

        const word = phrase[i];
        const data = scope.find(word.name, !word.maybe);
        if(data) { // might not exist if optional
            wordByAlias[word.alias] = word;
            dataByAlias[word.alias] = data;
        }

    }

    return function doWrite(msg) {

        for(const alias in msg){

            const data = dataByAlias[alias];
            if(data) {
                const word = wordByAlias[alias];
                const msgPart = msg[alias];
                data.silentWrite(msgPart, word.topic);
            }

        }

        for(const alias in msg){

            const data = dataByAlias[alias];
            if(data) {
                const word = wordByAlias[alias];
                data.refresh(word.topic);
            }

        }


    };


}


function getDoRead(scope, phrase){

    const len = phrase.length;
    const firstWord = phrase[0];

    if(len > 1 || firstWord.monitor) { // if only reading word is a wildcard subscription then hash as well
        return getDoReadMultiple(scope, phrase);
    } else {
        return getDoReadSingle(scope, firstWord);
    }

}


function getDoAnd(scope, phrase) {

    return getDoReadMultiple(scope, phrase, true);

}


function getDoReadSingle(scope, word) {

    return function doReadSingle() {

        const packet = getPacketFromDataWord(scope, word);
        return packet && packet.msg;

    };

}


function getDoReadMultiple(scope, phrase, isAndOperation){


        const len = phrase.length;


        return function doReadMultiple(msg, source) {

            const result = {};

            if(isAndOperation){

                if(source){
                    result[source] = msg;
                } else {
                    for (const p in msg) {
                        result[p] = msg[p];
                    }
                }
            }

            for (let i = 0; i < len; i++) {
                const word = phrase[i];

                if(word.monitor){

                    const survey = getSurveyFromDataWord(scope, word);
                    for(const [key, value] of survey){
                        result[key] = value;
                    }

                } else {

                    const packet = getPacketFromDataWord(scope, word);
                    const prop = word.monitor ? (word.alias || word.topic) : (word.alias || word.name);
                    if (packet)
                        result[prop] = packet.msg;

                }

            }

            return result;

        };

}


// get data stream -- store data in bus, emit into stream on pull()


function getDataWire(scope, word, canPull) {

    const data = scope.find(word.name, !word.maybe);
    if(word.monitor){
        return Wire.fromMonitor(data, word.alias, canPull);
    } else {
        return Wire.fromSubscribe(data, word.topic, word.alias, canPull);
    }

}

function isObject(v) {
    if (v === null)
        return false;
    return (typeof v === 'function') || (typeof v === 'object');
}


function getEventWire(word, target){

    return Wire.fromEvent(target, word.topic, word.useCapture, word.alias);

}

function doExtracts(value, extracts) {

    let result = value;
    const len = extracts.length;

    for (let i = 0; i < len; i++) {
        const extract = extracts[i];
        if(!isObject(result)) {
            if(extract.silentFail)
                return undefined;

            throwError('Cannot access property \'' + extract.name + '\' of ' + result);

        }
        result = result[extract.name];
    }


    return result;

}

function getNeedsArray(phrase){
    return phrase.filter(word => word.operation.need).map(word => word.alias);
}

function getDoMsgHashExtract(words) {

    const len = words.length;
    const extractsByAlias = {};

    for (let i = 0; i < len; i++) {

        const word = words[i];
        extractsByAlias[word.alias] = word.extracts;

    }

    return function(msg) {

        const result = {};
        for(const alias in extractsByAlias){
            const hasProp = msg.hasOwnProperty(alias);
            if(hasProp){
                result[alias] = doExtracts(msg[alias], extractsByAlias[alias]);
            }
        }

        return result;

    };

}

function getDoMsgExtract(word) {

    const extracts = word.extracts;

    return function(msg){
        return doExtracts(msg, extracts);
    }

}


function applyReaction(scope, bus, phrase, target) { // target is some event emitter

    const need = [];
    const skipDupes = [];
    const extracts = [];

    if(phrase.length === 1 && phrase[0].operation === 'ACTION'){
        const word = phrase[0];
        bus.wire(getDataWire(scope, word, false));
        return;
    }

    for(let i = 0; i < phrase.length; i++){

        const word = phrase[i];
        const operation = word.operation;

        if(operation === 'WATCH') {
            bus.wire(getDataWire(scope, word, true));
            skipDupes.push(word.alias)
        }
        else if(operation === 'WIRE'){
            bus.wire(getDataWire(scope, word, true));
        }
        else if(operation === 'EVENT') {
            bus.wire(getEventWire(word, target));
        }

        if(word.extracts)
            extracts.push(word);

        if(word.need)
            need.push(word.alias);

    }

    // transformations are applied via named hashes for performance

    if(bus._wires.length > 1) {

        bus.merge().group().batch();

        if(extracts.length)
            bus.msg(getDoMsgHashExtract(extracts));

        if(need.length)
            bus.hasKeys(need);

        if(skipDupes.length){
            bus.filter(getDoSkipNamedDupes(skipDupes));
        }

    } else {

        if(extracts.length)
            bus.msg(getDoMsgExtract(extracts[0]));

        if(skipDupes.length)
            bus.skipDupes();

    }

}

function isTruthy(msg){
    return !!msg;
}

function isFalsey(msg){
    return !msg;
}


function applyMethod(bus, word) {

    const method = word.extracts[0];

    switch(method){

        case 'true':
            bus.msg(true);
            break;

        case 'false':
            bus.msg(false);
            break;

        case 'null':
            bus.msg(null);
            break;

        case 'undefined':
            bus.msg(undefined);
            break;

        case 'array':
            bus.msg([]);
            break;

        case 'object':
            bus.msg({});
            break;

        case 'truthy':
            bus.filter(isTruthy);
            break;

        case 'falsey':
            bus.filter(isFalsey);
            break;

        case 'string':
            bus.msg(function(){ return word.extracts[1];});
            break;

            // throttle x, debounce x, delay x, last x, first x, all

    }

}

function applyProcess(scope, bus, phrase, context, node) {

    const operation = phrase[0].operation; // same for all words in a process phrase

    if(operation === 'READ') {
        bus.msg(getDoRead(scope, phrase));
        const needs = getNeedsArray(phrase);
        if(needs.length)
            bus.whenKeys(needs);
    } else if (operation === 'AND') {
        bus.msg(getDoAnd(scope, phrase));
        const needs = getNeedsArray(phrase);
        if (needs.length)
            bus.whenKeys(needs);
    } else if (operation === 'METHOD') {
        applyMethod(bus, phrase[0]);
    } else if (operation === 'FILTER') {
        applyFilterProcess(bus, phrase, context);
    } else if (operation === 'RUN') {
        applyMsgProcess(bus, phrase, context);
    } else if (operation === 'ALIAS') {
        applySourceProcess(bus, phrase[0]);
    } else if (operation === 'WRITE') {
        bus.run(getDoWrite(scope, phrase[0]));
    } else if (operation === 'SPRAY') {
        bus.run(getDoSpray(scope, phrase)); // todo validate that writes do not contain words in reacts

    }

}



function applyMsgProcess(bus, phrase, context){

    const len = phrase.length;

    for(let i = 0; i < len; i++) {

        const word = phrase[i];
        const name = word.name;
        const method = context[name];

        const f = function (msg, source, topic) {
            return method.call(context, msg, source, topic);
        };

        bus.msg(f);

    }

}


function applyRunProcess(bus, phrase, context){

    const len = phrase.length;

    for(let i = 0; i < len; i++) {

        const word = phrase[i];
        const name = word.name;
        const method = context[name];

        const f = function (msg, source, topic) {
            return method.call(context, msg, source, topic);
        };

        bus.run(f);

    }

}

function applySourceProcess(bus, word){

    bus.source(word.alias);

}


function applyFilterProcess(bus, phrase, context){

    const len = phrase.length;

    for(let i = 0; i < len; i++) {

        const word = phrase[i];
        const name = word.name;
        const method = context[name];

        const f = function (msg, source, topic) {
            return method.call(context, msg, source, topic);
        };

        bus.filter(f);

    }

}

function createBus(nyan, scope, context, target){

    let bus = new Bus(scope);
    return applyNyan(nyan, bus, context, target);

}

function applyNyan(nyan, bus, context, target){

    const len = nyan.length;
    const scope = bus.scope;
    for(let i = 0; i < len; i++){

        const cmd = nyan[i];
        const name = cmd.name;
        const phrase = cmd.phrase;

        if(name === 'JOIN') {
            bus = bus.join();
            bus.merge();
            bus.group();
            bus.sync();
        } else if(name === 'FORK'){
            bus = bus.fork();
        } else if (name === 'BACK'){
            bus = bus.back();
        } else {

            if(name === 'PROCESS')
                applyProcess(scope, bus, phrase, context, target);
            else // name === 'REACT'
                applyReaction(scope, bus, phrase, target);

        }
    }

    return bus;

}

const NyanRunner = {
    applyNyan: applyNyan,
    createBus: createBus
};


export default NyanRunner;
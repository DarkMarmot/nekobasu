
import Bus from '../src/bus.js';


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
            if(!lastMsg.hasOwnProperty(name) || lastMsg[name] !== msg[name] || isObject(msg[name]))
                diff = true;
            lastMsg[name] = msg[name];
        }

        return diff;

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
                const msgPart = msg[alias];
                data.silentWrite(msgPart);
            }

        }

        for(const alias in msg){

            const data = dataByAlias[alias];
            if(data) {
                data.refresh();
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

    const data = scope.find(word.name, !word.maybe);

    return function doReadSingle() {

        return data.read();

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

                    const data = scope.find(word.name, !word.maybe);
                    const prop = word.alias || word.name;
                    if (data.present)
                        result[prop] = data.read();

                }

            }

            return result;

        };

}


// get data stream -- store data in bus, emit into stream on pull()


function addDataSource(bus, scope, word) {

    const data = scope.find(word.name, !word.maybe);
    bus.addSubscribe(word.alias, data);

}

function addEventSource(bus, word, target) {

    bus.addEvent(word.alias, target, word.useCapture);

}


function isObject(v) {
    if (v === null)
        return false;
    return (typeof v === 'function') || (typeof v === 'object');
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


function applyReaction(scope, bus, phrase, target, lookup) { // target is some event emitter

    const need = [];
    const skipDupes = [];
    const extracts = [];

    if(phrase.length === 1 && phrase[0].operation === 'ACTION'){
        const word = phrase[0];
        addDataSource(bus, scope, word);
        return;
    }

    for(let i = 0; i < phrase.length; i++){

        const word = phrase[i];
        const operation = word.operation;

        if(operation === 'WATCH') {
            addDataSource(bus, scope, word);
            skipDupes.push(word.alias)
        }
        else if(operation === 'WIRE'){
            addDataSource(bus, scope, word);
        }
        else if(operation === 'EVENT') {
            addEventSource(bus, word, target);
        }

        if(word.extracts)
            extracts.push(word);

        if(word.need)
            need.push(word.alias);

    }

    // transformations are applied via named hashes for performance

    if(bus._sources.length > 1) {

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

function applyProcess(scope, bus, phrase, context, node, lookup) {

    const operation = phrase[0].operation; // same for all words in a process phrase

    if(operation === 'READ') {
        bus.msg(getDoRead(scope, phrase));
        const needs = getNeedsArray(phrase);
        if(needs.length)
            bus.hasKeys(needs);
    } else if (operation === 'AND') {
        bus.msg(getDoAnd(scope, phrase));
        const needs = getNeedsArray(phrase);
        if (needs.length)
            bus.hasKeys(needs);
    } else if (operation === 'METHOD') {
        applyMethod(bus, phrase[0]);
    } else if (operation === 'FILTER') {
        applyFilterProcess(bus, phrase, context, lookup);
    } else if (operation === 'RUN') {
        applyMsgProcess(bus, phrase, context, lookup);
    } else if (operation === 'ALIAS') {
        applySourceProcess(bus, phrase[0]);
    } else if (operation === 'WRITE') {
        applyWriteProcess(bus, scope, phrase[0]);
    } else if (operation === 'SPRAY') {

        bus.run(getDoSpray(scope, phrase)); // todo validate that writes do not contain words in reacts

    } else if (operation === 'ATTR') {
        // #attr:thing, #style:moo, #prop:innerText, #class
    }

}


function applyWriteProcess(bus, scope, word){

    const data = scope.find(word.name, !word.maybe);
    bus.write(data);

}

function applyMsgProcess(bus, phrase, context, lookup){

    const len = phrase.length;
    lookup = lookup || context;

    for(let i = 0; i < len; i++) {

        const word = phrase[i];
        const name = word.name;
        const method = lookup[name];

        bus.msg(method, context);

    }

}





function applySourceProcess(bus, word){

    bus.source(word.alias);

}


function applyFilterProcess(bus, phrase, context, lookup){

    const len = phrase.length;
    lookup = lookup || context;

    for(let i = 0; i < len; i++) {

        const word = phrase[i];
        const name = word.name;
        const method = lookup[name];

        bus.filter(method, context);

    }

}

function createBus(nyan, scope, context, target, lookup){

    let bus = new Bus(scope);
    return applyNyan(nyan, bus, context, target, lookup);

}

function applyNyan(nyan, bus, context, target, lookup){

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

        } else if(name === 'FORK'){
            bus = bus.fork();
        } else if (name === 'BACK'){
            bus = bus.back();
        } else {

            if(name === 'PROCESS')
                applyProcess(scope, bus, phrase, context, target, lookup);
            else // name === 'REACT'
                applyReaction(scope, bus, phrase, target, lookup);

        }
    }

    return bus;

}

const NyanRunner = {
    applyNyan: applyNyan,
    createBus: createBus
};


export default NyanRunner;
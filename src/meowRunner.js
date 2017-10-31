
import Bus from './bus.js';
import MeowParser from './meowParser.js';
import {isPrivate, isAction} from './dataTypes.js';

function runMeow(bus, meow){

    const phrases = MeowParser.parse(meow);
    for(let i = 0; i < phrases.length; i++){
        const phrase = phrases[i];
        runPhrase(bus, phrase);
    }

}

function runPhrase(bus, phrase){

    const name = phrase.cmd.name;
    const scope = bus.scope;
    const words = phrase.words;
    const context = bus.context;

    if(name === 'THEN_READ'){
        if(phrase.words.length > 1){
            bus.msg(getThenReadMultiple(scope, words));
        } else {
            const word = words[0];
            bus.msg(getThenReadOne(scope, word).read);
            bus.source(word.alias);
        }
    } else if(name === 'AND_READ'){
        bus.msg(getThenReadMultiple(scope, words, true));
    } else if(name === 'METHOD'){
        for(let i = 0; i < words.length; i++) {
            const word = words[i];
            const method = context[word.name];
            bus.msg(method, context);
        }
    } else if(name === 'FILTER'){
        for(let i = 0; i < words.length; i++) {
            const word = words[i];
            const method = context[word.name];
            bus.filter(method, context);
        }
    } else if(name === 'WATCH_EACH'){
        watchWords(bus, words);
    } else if(name === 'WATCH_TOGETHER'){
        watchWords(bus, words);
        bus.merge().group().batch();
        bus.hasKeys(toAliasList(words));
    } else if(name === 'WRITE'){
        // todo transaction
        const word = words[0];
        const data = scope.find(word.name);
        bus.write(data);
    }

}

// todo throw errors
function extractProperties(word, value){

    let maybe = word.maybe;
    let args = word.args;

    while (args.length) {
        const arg = args.shift();
        if(!value && maybe)
            return value;
        value = value[arg.name];
        maybe = arg.maybe;
    }

    return value;

}

function toAliasList(words){

    const list = [];
    for(let i = 0; i < words.length; i++) {
        const word = words[i];
        list.push(word.alias);
    }
    return list;

}

function watchWords(bus, words){

    const scope = bus.scope;

    for(let i = 0; i < words.length; i++) {

        const word = words[i];
        const watcher = new Bus(scope);
        const data = scope.find(word.name);

        watcher.addSubscribe(word.alias, data);
        watcher.msg(function(msg){
            return extractProperties(word, msg);
        });
        if(!isAction(word.name)){
            watcher.skipDupes();
        }

        bus.add(watcher);

    }

}


function getThenReadOne(scope, word){

    const state = scope.find(word.name);
    const reader = {};

    reader.read = function read(){
        const value = state.read();
        return extractProperties(word, value);
    };

    reader.present = function present(){
        return state.present();
    };

    return reader;

}

function getThenReadMultiple(scope, words, usingAnd){

    const readers = [];
    for(let i = 0; i < words.length; i++){
        const word = words[i];
        readers.push(getThenReadOne(scope, word));
    }

    return function thenReadMultiple(msg, source){

        const result = {};

        if(usingAnd) {
            if (source) {
                result[source] = msg;
            } else {
                for (const p in msg) {
                    result[p] = msg[p];
                }
            }
        }

        for(let i = 0; i < words.length; i++){
            const word = words[i];
            const prop = word.alias;
            const reader = readers[i];
            if(reader.present())
                result[prop] = reader.read();
        }

        return result;
    }

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
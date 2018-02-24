
import Catbus from './catbus.js';
import Bus from './bus.js';
import MeowParser from './meowParser.js';
import {isPrivate, isAction} from './dataTypes.js';

function runMeow(bus, meow){

    const phrases = Array.isArray(meow) ? meow : MeowParser.parse(meow);
    for(let i = 0; i < phrases.length; i++){
        const phrase = phrases[i];
        runPhrase(bus, phrase);
    }

}

function runPhrase(bus, phrase){

    const name = phrase.cmd.name;
    const scope = bus.scope;
    const words = phrase.words;
    const context = bus.context();
    const target = bus.target();
    const multiple = words.length > 1;

    if(name === 'HOOK'){
        const hook = words.shift();
        Catbus.runHook(bus, hook, words);
    }
    else if(name === 'THEN_READ'){
        if(multiple){
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
    } else if(name === 'EVENT'){
        watchEvents(bus, words);
    } else if(name === 'WATCH_EACH'){
        watchWords(bus, words);
    } else if(name === 'WATCH_SOME'){
        watchWords(bus, words);
        if(multiple)
            bus.merge().group();
        bus.batch();
    } else if(name === 'WATCH_TOGETHER'){
        watchWords(bus, words);
        if(multiple)
            bus.merge().group();
        bus.batch();
        if(multiple)
            bus.hasKeys(toAliasList(words));
    } else if(name === 'WRITE'){
        if(multiple) {
            // todo transaction, no actions
        } else {
            const word = words[0];
            const data = scope.find(word.name, true);
            bus.write(data);
        }
    }

}

// todo throw errors, could make hash by word string of parse functions for performance

function extractProperties(word, value){

    let maybe = word.maybe;
    let args = word.args;

    for(let i = 0; i < args.length; i++){
        const arg = args[i];
        if(!value && maybe)
            return value; // todo filter somewhere else, todo throw err on !maybe
        value = value[arg.name];
        maybe = arg.maybe;
    }

    return value;

}

function isWordNeeded(word){

    const {maybe, args} = word;

    if(args.length === 0)
        return !maybe; // one word only -- thus needed if not maybe

    const lastArg = args[args.length - 1];
    return !lastArg.maybe;


}

function toAliasList(words){

    const list = [];
    for(let i = 0; i < words.length; i++) {
        const word = words[i];
        if(isWordNeeded(word))
            list.push(word.alias);
    }
    return list;

}

function watchWords(bus, words){

    const scope = bus.scope;

    for(let i = 0; i < words.length; i++) {

        const word = words[i];
        const watcher = createWatcher(scope, word);
        bus.add(watcher);

    }

}

function createWatcher(scope, word){

    const watcher = scope.bus();
    const data = scope.find(word.name, true);

    watcher.addSubscribe(word.alias, data);

    if(word.args.length) {
        watcher.msg(function (msg) {
            return extractProperties(word, msg);
        });
    }

    if(!isAction(word.name)){
        watcher.skipDupes();
    }

    return watcher;

}

function watchEvents(bus, words){

    const scope = bus.scope;
    const target = bus.target();

    for(let i = 0; i < words.length; i++) { // todo add capture to words

        const word = words[i];
        const eventBus = createEventBus(scope, target, word);
        bus.add(eventBus);

    }

}


function createEventBus(scope, target, word){

    const eventBus = scope.bus();

    eventBus.addEvent(word.alias, target, word.name);

    if(word.args.length) {
        eventBus.msg(function (msg) {
            return extractProperties(word, msg);
        });
    }

    return eventBus;

}

// function getWriteTransaction(scope, words){
//
//     const writeSourceNames = [];
//     const writeTargetNames = [];
//     const targetsByName = {};
//
//     for(let i = 0; i < words.length; i++){
//         const word = words[i];
//         const sourceName = word.name;
//         const targetName = word.alias;
//         const target = scope.find()
//     }
//
//     return function writeTransaction(msg, source){
//
//         for(let i = 0; i < words.length; i++){
//
//         }
//
//     };
//
//
//
//     return reader;
//
// }


function getThenReadOne(scope, word){

    const state = scope.find(word.name, true);
    const reader = {};

    reader.read = function read(){
        const value = state.read();
        return extractProperties(word, value);
    };

    reader.present = function present(){
        return state.present;
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



// function getDoSpray(scope, phrase){
//
//     const wordByAlias = {};
//     const dataByAlias = {};
//
//     const len = phrase.length;
//
//     for(let i = 0; i < len; i++){ // todo, validate no dupe alias in word validator for spray
//
//         const word = phrase[i];
//         const data = scope.find(word.name, !word.maybe);
//         if(data) { // might not exist if optional
//             wordByAlias[word.alias] = word;
//             dataByAlias[word.alias] = data;
//         }
//
//     }
//
//     return function doWrite(msg) {
//
//         for(const alias in msg){
//
//             const data = dataByAlias[alias];
//             if(data) {
//                 const msgPart = msg[alias];
//                 data.silentWrite(msgPart);
//             }
//
//         }
//
//         for(const alias in msg){
//
//             const data = dataByAlias[alias];
//             if(data) {
//                 data.refresh();
//             }
//
//         }
//
//
//     };
//
//
// }




// get data stream -- store data in bus, emit into stream on pull()


// function addEventSource(bus, word, target) {
//
//     bus.addEvent(word.alias, target, word.useCapture);
//
// }


function isObject(v) {
    if (v === null)
        return false;
    return (typeof v === 'function') || (typeof v === 'object');
}



const MeowRunner = {
    runMeow: runMeow,
};


export default MeowRunner;
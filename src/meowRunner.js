
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
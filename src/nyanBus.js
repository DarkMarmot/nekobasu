import Stream from './stream.js';
import Nyan from './nyan.js';


function getPacketFromDataWord(scope, word){

    const data = scope.find(word.name, !word.maybe);

    if(!data)
        return null;

    return data.peek(word.topic);

}

function getMsgFromDataWord(scope, word){

    const data = scope.find(word.name, !word.maybe);

    if(data) {
        const topic = word.topic;
        const packet = data.peek(topic);
        if (packet)
            return packet.msg;
    }

    return undefined;

}


function getMsgTransform(scope, read){ // todo add monitor?

    const len = read.length;

    const f = function(msg) {

        for (let i = 0; i < len; i++) {
            const word = read[i];
            msg[word.alias || word.name] = getMsgFromDataWord(scope, read);
        }

        return msg;
    };

    return f;

}


function applyReaction(scope, bus, phrase, context, node) {

    const subscribe = [];
    const follow = [];
    const read = [];
    const need = [];
    const must = [];

    for(let i = 0; i < phrase.length; i++){

        const word = phrase[i];
        const operation = word.operation;

        if(operation.subscribe)
            subscribe.push(word);
        if(operation.read)
            read.push(word);
        if(operation.follow)
            follow.push(word);
        if(operation.name === 'NEED')
            need.push(word);
        if(operation.name === 'MUST')
            must.push(word);

    }

    // convert nyan words to streams

    for(let i = 0; i < subscribe.length; i++){
        const word = subscribe[i];
        const data = scope.find(word.name, !word.maybe);
        if(word.monitor){
            subscribe[i] = Stream.fromMonitor(data, word.alias);
        } else {
            subscribe[i] = Stream.fromSubscribe(data, word.topic, word.alias);
        }
    }

    for(let i = 0; i < follow.length; i++){

        // todo, follow/monitor, blast all topics?
        const word = follow[i];
        const data = scope.find(word.name, !word.maybe);
        follow[i] = Stream.fromFollow(data);

    }

    const reactions = subscribe.concat(follow);

    bus.addFrame(reactions);

    if(reactions.length)
        bus.merge().group();

    if(need.length)
        bus.whenKeys(need.map(d => d.name));

    if(reactions.length)
        bus.batch();

    if(read.length)
        bus.msg(getMsg(scope, read)); // and mix

    if(must.length)
        bus.whenKeys(must.map(d => d.name));


}


function applyProcess(scope, bus, phrase, context, node) {

    const operation = phrase[0].operation; // same for all words in a process phrase

    for(let i = 0; i < phrase.length; i++) {

        const word = phrase[i];


    }

    // {name: 'READ',   sym: null, then: true, with_react: true, read: true},
    // {name: 'MUST',   sym: '_',  then: true, with_react: true, read: true, need: true}, // must have data on read
    // {name: 'ATTR',   sym: '#',  then: true},
    // {name: 'AND',    sym: '&',  then: true},
    // {name: 'STYLE',  sym: '$',  then: true},
    // {name: 'WRITE',  sym: '=',  then: true},
    // {name: 'RUN',    sym: '*',  then: true},
    // {name: 'FILTER', sym: '%',  then: true}

}

// transform to read hash or single value

function applyReadProcess(scope, bus, phrase){
    bus.msg(getMsg(scope, phrase));
}

function applyAndProcess(scope, bus, phrase){

    const f = function(msg, source, topic){

    };

    bus.msg(getMsg(scope, phrase));
}




function applyRunProcess(bus, phrase, context){

    const len = phrase.length;

    for(let i = 0; i < len; i++) {

        const word = phrase[i];
        const name = word.name;
        const method = context[name];

        const f = function (msg, source, topic) {
            method.call(context, msg, source, topic);
        };

        bus.run(f);

    }

}


function applyFilterProcess(bus, phrase, context){

    const len = phrase.length;

    for(let i = 0; i < len; i++) {

        const word = phrase[i];
        const name = word.name;
        const method = context[name];

        const f = function (msg, source, topic) {
            method.call(context, msg, source, topic);
        };

        bus.filter(f);

    }

}


function applyNyan(scope, bus, str, context, node){

    const nyan = Nyan.parse(str);
    const len = nyan.length;

    for(let i = 0; i < len; i++){

        const cmd = nyan[i];
        const name = cmd.name;
        const phrase = cmd.phrase;

        if(name === 'FORK'){
            bus = bus.fork();
        } else if (name === 'JOIN'){
            bus = bus.join();
        } else {

            if(name === 'PROCESS')
                applyProcess(scope, bus, phrase, context, node);
            else // name === 'REACT'
                applyReaction(scope, bus, phrase, context, node);

        }
    }

    return bus;

}
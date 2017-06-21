
function TO_SOURCE(msg, source, topic) {
    return source;
}

class Group {

    constructor(def){

        this.action = def.action || TO_SOURCE;
        this.value = {};

    }

    handle(frame, wire, msg, source, topic){

        const g = this.action(msg, source);
        const hash = this.value;

        if(g) {
            hash[g] = msg;
        } else { // no source, copy message props into hash to merge nameless streams of key data
            for(const k in msg){
                hash[k] = msg[k];
            }
        }

        frame.emit(wire, hash, source, topic);

    }

    reset(){
        this.value = {};
    }

    next(){
        return this.value;
    }

    content(){
        return this.value;
    }

}

export default Group;
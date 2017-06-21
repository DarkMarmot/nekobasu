

class FirstN {

    constructor(n){

        this.value = [];
        this.max = n;

    }

    handle(frame, wire, msg, source, topic){

        const list = this.value;
        if(list.length < this.max)
            list.push(msg);

        frame.emit(wire, list, source, topic);

    }

    reset(){
        this.value = [];
    }

    next(){
        return this.value;
    }

    content(){
        return this.value;
    }

}

export default FirstN;
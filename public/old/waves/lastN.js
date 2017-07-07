

class LastN {

    constructor(n){

        this.value = [];
        this.max = n;

    }

    handle(frame, wire, msg, source, topic){

        const list = this.value;
        list.push(msg);
        if(list.length > this.max)
            list.shift();

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

export default LastN;
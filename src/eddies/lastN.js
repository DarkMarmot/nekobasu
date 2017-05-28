

class LastN {

    constructor(n){

        this.value = [];
        this.max = n;
        this.hasValue = false;

    }

    handle(msg){

        const list = this.value;
        list.push(msg);
        if(list.length > this.max)
            list.shift();
        this.hasValue = true;

    }

    reset(){

        this.value = [];
        this.hasValue = false;

    }

    next(){
        return this.value;
    }

    content(){
        return this.value;
    }

}

export default LastN;